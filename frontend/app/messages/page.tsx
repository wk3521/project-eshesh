import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/time'
import { fetchPendingRequests, fetchConversations, otherParticipant } from '@/lib/messaging'
import MessageRequestActions from '@/app/components/MessageRequestActions'

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: requests }, { data: conversations }] = await Promise.all([
    fetchPendingRequests(supabase, user.id),
    fetchConversations(supabase, user.id),
  ])

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
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="rounded-xl border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
            >
              {otherParticipant(c, user.id)?.full_name ?? 'Unknown'}
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
