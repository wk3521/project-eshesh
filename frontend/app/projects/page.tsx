import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, description, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main style={{ padding: '3rem' }}>
      <h1>My projects</h1>
      <Link href="/projects/new" className="cursor-pointer">
        Create new project
      </Link>
      {error ? (
        <p role="alert" style={{ color: 'red' }}>
          Could not load projects: {error.message}
        </p>
      ) : projects.length === 0 ? (
        <p>You don&apos;t have any projects yet.</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none', padding: 0 }}>
          {projects.map((project) => (
            <li key={project.id}>
              <h2>{project.title}</h2>
              <p>{project.description}</p>
              <small>Created {new Date(project.created_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
