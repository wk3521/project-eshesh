import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/time'
import MessageRequestActions from '@/app/components/MessageRequestActions'

type Request = {
  id: string
  pitch: string | null
  created_at: string
  applicant_id: string
  profiles: { full_name: string } | null
  projects: { id: string; title: string } | null
}

type Conversation = {
  id: string
  created_at: string
  user_a_id: string
  user_b_id: string
  a: { id: string; full_name: string } | null
  b: { id: string; full_name: string } | null
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: requests } = await supabase
    .from('applications')
    .select('id, pitch, created_at, applicant_id, profiles!applications_applicant_id_fkey(full_name), projects!inner(id, title, owner_id)')
    .eq('message_request_status', 'pending')
    .eq('projects.owner_id', user.id)
    .order('created_at', { ascending: false })
    .returns<Request[]>()

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, created_at, user_a_id, user_b_id, a:profiles!conversations_user_a_id_fkey(id, full_name), b:profiles!conversations_user_b_id_fkey(id, full_name)')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .returns<Conversation[]>()

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold">Messages</h1>

      <h2 className="mt-6 text-sm font-semibold text-neutral-500">Requests</h2>
      {!requests || requests.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">No pending message requests.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-sm">
                <span className="font-medium">{r.profiles?.full_name ?? 'Unknown'}</span>{' '}
                applied to{' '}
                {r.projects && (
                  <Link href={`/projects/${r.projects.id}`} className="underline">{r.projects.title}</Link>
                )}
              </p>
              {r.pitch && <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{r.pitch}</p>}
              <p className="mt-1 text-xs text-neutral-400">{timeAgo(r.created_at)} ago</p>
              <div className="mt-3">
                <MessageRequestActions applicationId={r.id} applicantId={r.applicant_id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-neutral-500">Conversations</h2>
      {!conversations || conversations.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">No conversations yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {conversations.map((c) => {
            const other = c.user_a_id === user.id ? c.b : c.a
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="rounded-xl border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                {other?.full_name ?? 'Unknown'}
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
