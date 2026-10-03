'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/time'
import {
  fetchPendingRequests,
  fetchConversations,
  otherParticipant,
  type MessageRequest,
  type ConversationSummary,
} from '@/lib/messaging'
import MessageRequestActions from '@/app/components/MessageRequestActions'
import MessageThread from '@/app/components/MessageThread'
import MessageComposer from '@/app/components/MessageComposer'

type Message = { id: string; sender_id: string; content: string; created_at: string }

export default function ChatWidget({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [requests, setRequests] = useState<MessageRequest[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])

  async function loadInbox() {
    const supabase = createClient()
    const [{ data: requestsData }, { data: conversationsData }] = await Promise.all([
      fetchPendingRequests(supabase, userId),
      fetchConversations(supabase, userId),
    ])
    setRequests(requestsData ?? [])
    setConversations(conversationsData ?? [])
  }

  // ponytail: no live badge for new messages (would need a per-user
  // last-read-at to compute), so this only refreshes on mount/open —
  // pending-request count is the only thing the badge reflects.
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    Promise.all([fetchPendingRequests(supabase, userId), fetchConversations(supabase, userId)]).then(
      ([{ data: requestsData }, { data: conversationsData }]) => {
        if (cancelled) return
        setRequests(requestsData ?? [])
        setConversations(conversationsData ?? [])
      }
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  async function openThread(conversation: ConversationSummary) {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .returns<Message[]>()
    setThreadMessages(data ?? [])
    setActiveConversation(conversation)
  }

  async function openThreadById(conversationId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('conversations')
      .select('id, created_at, user_a_id, user_b_id, a:profiles!conversations_user_a_id_fkey(id, full_name), b:profiles!conversations_user_b_id_fkey(id, full_name)')
      .eq('id', conversationId)
      .single()
      .returns<ConversationSummary>()
    if (data) await openThread(data)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); loadInbox() }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-2xl text-white shadow-lg hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900"
        aria-label="Open messages"
      >
        💬
        {requests.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {requests.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-80 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-200 p-3 dark:border-neutral-800">
        {activeConversation ? (
          <button onClick={() => setActiveConversation(null)} className="text-sm text-neutral-500 hover:underline">
            ‹ Back
          </button>
        ) : (
          <span className="text-sm font-semibold">Messages</span>
        )}
        {activeConversation && (
          <span className="text-sm font-medium">{otherParticipant(activeConversation, userId)?.full_name ?? 'Unknown'}</span>
        )}
        <button onClick={() => setOpen(false)} className="text-sm text-neutral-500 hover:underline" aria-label="Close messages">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeConversation ? (
          <MessageThread conversationId={activeConversation.id} initialMessages={threadMessages} userId={userId} />
        ) : (
          <>
            <h3 className="text-xs font-semibold uppercase text-neutral-400">Requests</h3>
            {requests.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">No pending requests.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {requests.map((r) => (
                  <div key={r.id} className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
                    <p className="text-sm">
                      <span className="font-medium">{r.profiles?.full_name ?? 'Unknown'}</span>{' '}
                      {r.projects && (
                        <>applied to <Link href={`/projects/${r.projects.id}`} className="underline">{r.projects.title}</Link></>
                      )}
                    </p>
                    {r.pitch && <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{r.pitch}</p>}
                    <p className="mt-1 text-xs text-neutral-400">{timeAgo(r.created_at)} ago</p>
                    <div className="mt-2">
                      <MessageRequestActions
                        applicationId={r.id}
                        applicantId={r.applicant_id}
                        onDeclined={loadInbox}
                        onAccepted={(conversationId) => {
                          loadInbox()
                          openThreadById(conversationId)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="mt-4 text-xs font-semibold uppercase text-neutral-400">Conversations</h3>
            {conversations.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">No conversations yet.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-1">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openThread(c)}
                    className="rounded-lg p-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    {otherParticipant(c, userId)?.full_name ?? 'Unknown'}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {activeConversation && (
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <MessageComposer conversationId={activeConversation.id} />
        </div>
      )}
    </div>
  )
}
