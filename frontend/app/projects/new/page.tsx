import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewProject from '@/app/pages/NewProject'

export default async function NewProjectPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <NewProject />
}
