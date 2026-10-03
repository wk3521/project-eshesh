import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessageComposer from '@/app/components/MessageComposer'
import MessageThread from '@/app/components/MessageThread'

type Conversation = {
  id: string
  user_a_id: string
  user_b_id: string
  a: { full_name: string } | null
  b: { full_name: string } | null
}

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, user_a_id, user_b_id, a:profiles!conversations_user_a_id_fkey(full_name), b:profiles!conversations_user_b_id_fkey(full_name)')
    .eq('id', id)
    .maybeSingle()
    .returns<Conversation>()

  if (!conversation) notFound()
  if (conversation.user_a_id !== user.id && conversation.user_b_id !== user.id) notFound()

  const other = conversation.user_a_id === user.id ? conversation.b : conversation.a

  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .returns<Message[]>()

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold">{other?.full_name ?? 'Unknown'}</h1>

      <div className="mt-6">
        <MessageThread conversationId={id} initialMessages={messages ?? []} userId={user.id} />
      </div>

      <MessageComposer conversationId={id} />
    </main>
  )
}
