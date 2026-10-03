'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/time'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default function MessageThread({
  conversationId,
  initialMessages,
  userId,
}: {
  conversationId: string
  initialMessages: Message[]
  userId: string
}) {
  const [messages, setMessages] = useState(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const next = payload.new as Message
          setMessages((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  if (messages.length === 0) {
    return <p className="text-center text-sm text-neutral-500">Say hello.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((m) => {
        const mine = m.sender_id === userId
        return (
          <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${mine ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900' : 'border border-neutral-200 dark:border-neutral-800'}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className={`mt-1 text-xs ${mine ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-400'}`}>{timeAgo(m.created_at)} ago</p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
