import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/time'
import { type MediaItem } from '@/lib/media'
import { PROJECT_LABELS_SELECT, disciplineNames, tagNames, type ProjectLabels } from '@/lib/projects'
import ResumePreview from '@/app/components/ResumePreview'
import ImageCarousel from '@/app/components/ImageCarousel'
import MessageRequestActions from '@/app/components/MessageRequestActions'

type ProjectDetail = ProjectLabels & {
  id: string
  title: string
  description: string
  status: string | null
  media: MediaItem[] | null
  created_at: string
  owner_id: string
  profiles: { full_name: string } | null
  communities: { name: string } | null
  project_skills: { skills: { name: string } | null }[]
}

type Applicant = {
  id: string
  applicant_id: string
  pitch: string | null
  status: string | null
  message_request_status: string | null
  created_at: string
  profiles: { full_name: string; major: string | null; school: string | null; resume_path: string | null } | null
}

export default async function ProjectDetailPage({
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
    .select(`id, title, description, status, media, created_at, owner_id, profiles!projects_owner_id_fkey(full_name), communities(name), project_skills(skills(name)), ${PROJECT_LABELS_SELECT}`)
    .eq('id', id)
    .maybeSingle()
    .returns<ProjectDetail>()

  if (!project) notFound()

  const isOwner = project.owner_id === user.id
  const disciplines = disciplineNames(project)
  const tags = tagNames(project)

  let applicants: Applicant[] = []
  const conversationIdByUser = new Map<string, string>()
  if (isOwner) {
    const { data } = await supabase
      .from('applications')
      .select('id, applicant_id, pitch, status, message_request_status, created_at, profiles!applications_applicant_id_fkey(full_name, major, school, resume_path)')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .returns<Applicant[]>()
    applicants = data ?? []

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, user_a_id, user_b_id')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    for (const c of conversations ?? []) {
      const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id
      conversationIdByUser.set(otherId, c.id)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold">{project.title}</h1>
        {project.status && (
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {project.status}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
        <span>{project.profiles?.full_name ?? 'Unknown'}</span>
        {project.communities && (
          <>
            <span>·</span>
            <span>{project.communities.name}</span>
          </>
        )}
        <span>·</span>
        <span>{timeAgo(project.created_at)} ago</span>
      </div>

      {disciplines.length > 0 && <p className="mt-2 text-sm text-neutral-500">{disciplines.join(' · ')}</p>}

      {project.media && project.media.length > 0 && (
        <div className="mt-4">
          <ImageCarousel media={project.media} />
        </div>
      )}

      <p className="mt-4 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{project.description}</p>

      {(tags.length > 0 || project.project_skills.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
              {tag}
            </span>
          ))}
          {project.project_skills.map((ps) => ps.skills && (
            <span key={ps.skills.name} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {ps.skills.name}
            </span>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="mt-8 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Applicants ({applicants.length})</h2>
          {applicants.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No one has applied yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {applicants.map((a) => (
                <div key={a.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{a.profiles?.full_name ?? 'Unknown'}</p>
                    {a.status && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {a.status}
                      </span>
                    )}
                  </div>
                  {(a.profiles?.major || a.profiles?.school) && (
                    <p className="text-sm text-neutral-500">
                      {[a.profiles?.major, a.profiles?.school].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {a.pitch && <p className="mt-2 whitespace-pre-wrap text-sm">{a.pitch}</p>}
                  <div className="mt-3">
                    {a.profiles?.resume_path ? (
                      <ResumePreview
                        url={supabase.storage.from('resumes').getPublicUrl(a.profiles.resume_path).data.publicUrl}
                        name={`${a.profiles.full_name}'s resume`}
                      />
                    ) : (
                      <p className="text-sm text-neutral-400">No resume uploaded.</p>
                    )}
                  </div>
                  {a.message_request_status === 'pending' && (
                    <div className="mt-3">
                      <MessageRequestActions applicationId={a.id} applicantId={a.applicant_id} />
                    </div>
                  )}
                  {a.message_request_status === 'accepted' && conversationIdByUser.has(a.applicant_id) && (
                    <div className="mt-3">
                      <Link href={`/messages/${conversationIdByUser.get(a.applicant_id)}`} className="text-sm underline">
                        Message
                      </Link>
                    </div>
                  )}
                  {a.message_request_status === 'declined' && (
                    <p className="mt-3 text-sm text-neutral-400">Message request declined.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
