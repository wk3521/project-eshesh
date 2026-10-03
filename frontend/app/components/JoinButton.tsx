'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function JoinButton({
  communityId,
  initialJoined,
}: {
  communityId: string
  initialJoined: boolean
}) {
  const router = useRouter()
  const [joined, setJoined] = useState(initialJoined)
  const [pending, setPending] = useState(false)

  async function toggle() {
    setPending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (joined) {
      await supabase.from('community_members').delete().eq('community_id', communityId).eq('profile_id', user.id)
    } else {
      await supabase.from('community_members').insert({ community_id: communityId, profile_id: user.id })
    }
    setJoined(!joined)
    setPending(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        joined
          ? 'rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-600 hover:border-red-300 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-300'
          : 'rounded-full bg-neutral-800 px-3 py-1 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300'
      }
    >
      {joined ? 'Joined' : 'Join'}
    </button>
  )
}
