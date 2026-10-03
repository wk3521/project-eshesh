'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, content: content.trim() })

    setSending(false)

    if (error) {
      setError(error.message)
      return
    }
    setContent('')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="mt-4 flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a message"
        className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
      />
      <button
        type="submit"
        disabled={sending || !content.trim()}
        className="rounded-full bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Send
      </button>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </form>
  )
}
