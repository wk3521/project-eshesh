import type { SupabaseClient } from '@supabase/supabase-js'

export type MessageRequest = {
  id: string
  pitch: string | null
  created_at: string
  applicant_id: string
  profiles: { full_name: string } | null
  projects: { id: string; title: string } | null
}

export type ConversationSummary = {
  id: string
  created_at: string
  user_a_id: string
  user_b_id: string
  a: { id: string; full_name: string } | null
  b: { id: string; full_name: string } | null
}

// Shared by the full /messages page (server-fetched) and the ChatWidget
// (client-fetched) so the two don't drift apart.
export function fetchPendingRequests(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('applications')
    .select('id, pitch, created_at, applicant_id, profiles!applications_applicant_id_fkey(full_name), projects!inner(id, title, owner_id)')
    .eq('message_request_status', 'pending')
    .eq('projects.owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<MessageRequest[]>()
}

export function fetchConversations(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('conversations')
    .select('id, created_at, user_a_id, user_b_id, a:profiles!conversations_user_a_id_fkey(id, full_name), b:profiles!conversations_user_b_id_fkey(id, full_name)')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .returns<ConversationSummary[]>()
}

export function otherParticipant(conversation: ConversationSummary, userId: string) {
  return conversation.user_a_id === userId ? conversation.b : conversation.a
}
