import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type MediaItem = { url: string; type?: 'image' | 'video' }

type ProjectPost = {
  id: string
  title: string
  description: string
  discipline: string | null
  status: string | null
  media: MediaItem[] | null
  created_at: string
  project_skills: { skills: { name: string } | null }[]
}

function timeAgo(isoDate: string) {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  const steps: [number, string][] = [
    [60, 's'],
    [60, 'm'],
    [24, 'h'],
    [7, 'd'],
    [4.345, 'w'],
    [12, 'mo'],
    [Infinity, 'y'],
  ]
  let value = seconds
  for (const [unit, label] of steps) {
    if (value < unit) return `${Math.max(1, Math.floor(value))}${label}`
    value /= unit
  }
  return `${Math.floor(value)}y`
}

function isVideo(item: MediaItem) {
  return item.type === 'video' || /\.(mp4|webm|mov)$/i.test(item.url)
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, description, discipline, status, media, created_at, project_skills(skills(name))')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .returns<ProjectPost[]>()

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My projects</h1>
        <Link
          href="/projects/new"
          className="rounded-full bg-neutral-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          Create new project
        </Link>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-red-500">
          Could not load projects: {error.message}
        </p>
      ) : !projects || projects.length === 0 ? (
        <p className="mt-8 text-center text-neutral-500">
          You don&apos;t have any projects yet.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const cover = project.media?.[0]

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                <div className="flex aspect-video items-center justify-center bg-neutral-100 dark:bg-neutral-900">
                  {cover ? (
                    isVideo(cover) ? (
                      <video
                        src={cover.url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.url} alt="" className="h-full w-full object-cover" />
                    )
                  ) : (
                    <span className="text-sm text-neutral-400 dark:text-neutral-600">No media</span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{project.title}</p>
                      {project.status && (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {project.status}
                        </span>
                      )}
                    </div>
                    {project.discipline && (
                      <p className="text-sm text-neutral-500">{project.discipline}</p>
                    )}
                  </div>

                  <p className="line-clamp-3 flex-1 text-sm text-neutral-700 dark:text-neutral-300">
                    {project.description}
                  </p>

                  {project.project_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.project_skills.map(
                        (ps) =>
                          ps.skills && (
                            <span
                              key={ps.skills.name}
                              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                              {ps.skills.name}
                            </span>
                          )
                      )}
                    </div>
                  )}

                  <p className="border-t border-neutral-200 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
                    Posted {timeAgo(project.created_at)} ago
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
