'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Finds or creates the 1:1 conversation between the current user and
// otherUserId, using a canonical (lower-uuid-first) pair so the same two
// people never end up with two conversations.
async function openConversationWith(otherUserId: string, userId: string) {
  const supabase = createClient()
  const [userAId, userBId] = [userId, otherUserId].sort()

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a_id', userAId)
    .eq('user_b_id', userBId)
    .maybeSingle()

  if (existing) return { id: existing.id, error: null }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_a_id: userAId, user_b_id: userBId })
    .select('id')
    .single()

  return { id: created?.id, error }
}

export default function MessageRequestActions({
  applicationId,
  applicantId,
}: {
  applicationId: string
  applicantId: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function respond(accept: boolean) {
    setPending(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (!accept) {
      const { error } = await supabase
        .from('applications')
        .update({ message_request_status: 'declined' })
        .eq('id', applicationId)
      setPending(false)
      if (error) setError(error.message)
      else router.refresh()
      return
    }

    const { id: conversationId, error: conversationError } = await openConversationWith(applicantId, user.id)
    if (conversationError || !conversationId) {
      setPending(false)
      setError(conversationError?.message ?? 'Could not open the conversation.')
      return
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update({ message_request_status: 'accepted' })
      .eq('id', applicationId)

    setPending(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.push(`/messages/${conversationId}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => respond(true)}
        disabled={pending}
        className="rounded-full bg-neutral-800 px-3 py-1 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        Accept
      </button>
      <button
        onClick={() => respond(false)}
        disabled={pending}
        className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-600 hover:border-red-300 hover:text-red-600 dark:border-neutral-700 dark:text-neutral-300"
      >
        Decline
      </button>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
