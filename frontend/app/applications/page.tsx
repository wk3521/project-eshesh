import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/time'
import { PROJECT_LABELS_SELECT, disciplineNames, tagNames, type ProjectLabels } from '@/lib/projects'

type Application = {
  id: string
  pitch: string | null
  status: string | null
  created_at: string
  projects: (ProjectLabels & {
    id: string
    title: string
    communities: { name: string } | null
    profiles: { full_name: string } | null
  }) | null
}

export default async function MyApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: applications, error } = await supabase
    .from('applications')
    .select(`id, pitch, status, created_at, projects(id, title, communities(name), profiles!projects_owner_id_fkey(full_name), ${PROJECT_LABELS_SELECT})`)
    .eq('applicant_id', user.id)
    .order('created_at', { ascending: false })
    .returns<Application[]>()

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold">My applications</h1>

      {error ? (
        <p role="alert" className="mt-4 text-red-500">Could not load applications: {error.message}</p>
      ) : !applications || applications.length === 0 ? (
        <p className="mt-8 text-center text-neutral-500">
          You haven&apos;t applied to any projects yet.{' '}
          <Link href="/explore" className="underline">Browse Explore</Link> to find one.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {applications.map((a) => (
            <Link
              key={a.id}
              href={a.projects ? `/projects/${a.projects.id}` : '#'}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{a.projects?.title ?? 'Deleted project'}</p>
                {a.status && (
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {a.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500">
                {[a.projects?.profiles?.full_name, a.projects?.communities?.name].filter(Boolean).join(' · ')}
              </p>
              {a.projects && disciplineNames(a.projects).length > 0 && (
                <p className="text-sm text-neutral-500">{disciplineNames(a.projects).join(' · ')}</p>
              )}
              {a.projects && tagNames(a.projects).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tagNames(a.projects).map((tag) => (
                    <span key={tag} className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {a.pitch && <p className="text-sm text-neutral-700 dark:text-neutral-300">{a.pitch}</p>}
              <p className="text-sm text-neutral-400">Applied {timeAgo(a.created_at)} ago</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
