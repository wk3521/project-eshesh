import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JoinButton from '@/app/components/JoinButton'

type Community = { id: string; name: string; description: string | null }

export default async function CommunitiesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: communities, error } = await supabase
    .from('communities')
    .select('id, name, description')
    .order('name')
    .returns<Community[]>()

  const { data: memberships } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('profile_id', user.id)

  const joinedIds = new Set((memberships ?? []).map((m) => m.community_id))

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold">Communities</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Join a community to see and post in its feed on Explore.
      </p>

      {error ? (
        <p role="alert" className="mt-4 text-red-500">Could not load communities: {error.message}</p>
      ) : !communities || communities.length === 0 ? (
        <p className="mt-8 text-center text-neutral-500">No communities yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {communities.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div>
                <p className="font-semibold">{c.name}</p>
                {c.description && (
                  <p className="mt-0.5 text-sm text-neutral-500">{c.description}</p>
                )}
              </div>
              <JoinButton communityId={c.id} initialJoined={joinedIds.has(c.id)} />
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
