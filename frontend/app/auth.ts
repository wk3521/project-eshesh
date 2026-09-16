import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export type SignUpProfile = {
  firstName: string
  lastName: string
  school: string
  major: string
  gradYear: string
}

const EDU_EMAIL_PATTERN = /@[^@]+\.edu$/i
const MIN_PASSWORD_LENGTH = 8

export async function signUpNewUser(
  email: string,
  password: string,
  profile: SignUpProfile
) {
  if (!EDU_EMAIL_PATTERN.test(email)) {
    return {
      data: { user: null, session: null },
      error: new Error('Please use a valid .edu email address.'),
    }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      data: { user: null, session: null },
      error: new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      ),
    }
  }

  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: {
        first_name: profile.firstName,
        last_name: profile.lastName,
        school: profile.school,
        major: profile.major,
        grad_year: profile.gradYear,
      },
    },
  })

  if (result.error?.message.includes('Database error saving new user')) {
    return {
      ...result,
      error: new Error(
        'Something went wrong creating your account. Please make sure you are using a valid .edu email address.'
      ),
    }
  }

  return result
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}
