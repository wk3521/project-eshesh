import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewEntryComposer from '@/app/components/NewEntryComposer'

type Community = { id: string; slug: string; name: string }

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>
}) {
  const { community: communitySlug } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: joined } = await supabase
    .from('community_members')
    .select('communities(id, slug, name)')
    .eq('profile_id', user.id)
    .returns<{ communities: Community }[]>()

  const communities = (joined ?? []).map((j) => j.communities).sort((a, b) => a.name.localeCompare(b.name))
  const presetCommunityId = communities.find((c) => c.slug === communitySlug)?.id

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">New post</h1>
        <Link href="/explore" className="text-sm text-neutral-500 hover:underline">
          Back to Explore
        </Link>
      </div>

      {communities.length === 0 ? (
        <p className="mt-8 text-center text-neutral-500">
          You haven&apos;t joined any communities yet.{' '}
          <Link href="/communities" className="underline">Browse communities</Link> to get started.
        </p>
      ) : (
        <div className="mt-6">
          <NewEntryComposer communities={communities} presetCommunityId={presetCommunityId} />
        </div>
      )}
    </main>
  )
}
