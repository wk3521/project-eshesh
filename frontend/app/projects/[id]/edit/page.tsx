import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type MediaItem } from '@/lib/media'
import NewProject from '@/app/pages/NewProject'

type Community = { id: string; name: string }

type ProjectRow = {
  id: string
  owner_id: string
  community_id: string | null
  title: string
  description: string
  media: MediaItem[] | null
  communities: Community | null
  project_discipline: { discipline_id: number }[] | null
  project_tag: { tag_id: number }[] | null
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, owner_id, community_id, title, description, media, communities(id, name), project_discipline(discipline_id), project_tag(tag_id)')
    .eq('id', id)
    .maybeSingle()
    .returns<ProjectRow>()

  if (!project) notFound()
  if (project.owner_id !== user.id) redirect(`/projects/${id}`)

  const { data: joined } = await supabase
    .from('community_members')
    .select('communities(id, name)')
    .eq('profile_id', user.id)
    .returns<{ communities: Community }[]>()

  const communities = (joined ?? []).map((j) => j.communities)
  // Keep the project's current community selectable even if the owner has since left it
  if (project.communities && !communities.some((c) => c.id === project.communities?.id)) {
    communities.push(project.communities)
  }
  communities.sort((a, b) => a.name.localeCompare(b.name))

  return (
    <NewProject
      communities={communities}
      redirectTo={`/projects/${id}`}
      project={{
        id: project.id,
        communityId: project.community_id,
        title: project.title,
        description: project.description,
        media: project.media ?? [],
        disciplineIds: (project.project_discipline ?? []).map((pd) => pd.discipline_id),
        tagIds: (project.project_tag ?? []).map((pt) => pt.tag_id),
      }}
    />
  )
}
