import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { id, firstName, lastName, school, major, gradYear } =
    await request.json()

  const supabase = await createClient()

  const { error } = await supabase.from('profiles').insert({
    id,
    full_name: `${firstName} ${lastName}`.trim(),
    school,
    major,
    grad_year: gradYear,
    bio: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
