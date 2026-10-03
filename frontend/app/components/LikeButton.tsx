'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string
  initialLiked: boolean
  initialCount: number
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)

  async function toggle() {
    setPending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('profile_id', user.id)
      setCount((c) => c - 1)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, profile_id: user.id })
      setCount((c) => c + 1)
    }
    setLiked(!liked)
    setPending(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        liked
          ? 'flex items-center gap-1.5 text-sm font-medium text-red-500'
          : 'flex items-center gap-1.5 text-sm text-neutral-500 hover:text-red-500 dark:text-neutral-400'
      }
    >
      <span>{liked ? '♥' : '♡'}</span>
      <span>{count}</span>
    </button>
  )
}
