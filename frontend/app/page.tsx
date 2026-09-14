import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('skills')
    .select('*', { count: 'exact', head: true })

  return (
    <main style={{ padding: '3rem', fontFamily: 'sans-serif' }}>
      <h1>Project Eshesh 🚀</h1>
      {error ? (
        <p style={{ color: 'red' }}>
          Supabase connection error: {error.message}
        </p>
      ) : (
        <p>✅ Connected to Supabase — {count} skills seeded.</p>
      )}
    </main>
  )
}