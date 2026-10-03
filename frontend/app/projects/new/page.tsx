import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewProject from '@/app/pages/NewProject'

type Community = { id: string; name: string }

export default async function NewProjectPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: joined } = await supabase
    .from('community_members')
    .select('communities(id, name)')
    .eq('profile_id', user.id)
    .returns<{ communities: Community }[]>()

  const communities = (joined ?? []).map((j) => j.communities).sort((a, b) => a.name.localeCompare(b.name))

  return <NewProject communities={communities} />
}
