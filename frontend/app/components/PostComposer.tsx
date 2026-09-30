'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MAX_LENGTH = 500

export default function PostComposer({
  communities,
  presetCommunityId,
  redirectTo,
}: {
  communities: { id: string; name: string }[]
  presetCommunityId?: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [communityId, setCommunityId] = useState(presetCommunityId ?? communities[0]?.id ?? '')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  if (communities.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
        Join a community below to start posting.
      </p>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('posts')
      .insert({ community_id: communityId, author_id: user.id, content: content.trim() })

    if (error) {
      setError(error.message)
    } else if (redirectTo) {
      router.push(redirectTo)
      router.refresh()
    } else {
      setContent('')
      router.refresh()
    }
    setPosting(false)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">Posting to</span>
        {presetCommunityId ? (
          <span className="text-sm font-medium">{communities.find((c) => c.id === presetCommunityId)?.name}</span>
        ) : (
          <select
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_LENGTH}
        placeholder="What's happening?"
        className="min-h-[70px] resize-none rounded-md border border-neutral-300 bg-transparent p-2 text-sm dark:border-neutral-700"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">{content.length}/{MAX_LENGTH}</span>
        <button
          type="submit"
          disabled={posting || !content.trim()}
          className="rounded-full bg-neutral-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          Post
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </form>
  )
}
