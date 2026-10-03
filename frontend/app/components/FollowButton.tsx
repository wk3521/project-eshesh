'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function FollowButton({
  profileId,
  initialFollowing,
}: {
  profileId: string
  initialFollowing: boolean
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, setPending] = useState(false)

  async function toggle() {
    setPending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (following) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', profileId)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, followed_id: profileId })
    }
    setFollowing(!following)
    setPending(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        following
          ? 'rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-600 hover:border-red-300 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-300'
          : 'rounded-full bg-neutral-800 px-3 py-1 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300'
      }
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
