import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export type SignUpProfile = {
  firstName: string
  lastName: string
  school: string
  major: string
  gradYear: string
}

export async function signUpNewUser(
  email: string,
  password: string,
  profile: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error || !data.user) {
    return { data, error }
  }

  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: data.user.id, ...profile }),
  })

  if (!response.ok) {
    const { error: profileError } = await response.json()
    return { data, error: new Error(profileError ?? 'Failed to create profile') }
  }

  return { data, error: null }
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}
