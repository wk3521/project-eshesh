import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/time'
import { isVideo, type MediaItem } from '@/lib/media'
import JoinButton from '@/app/components/JoinButton'
import LikeButton from '@/app/components/LikeButton'
import ApplyButton from '@/app/components/ApplyButton'

type Community = { id: string; slug: string; name: string }

type Post = {
  id: string
  community_id: string
  content: string
  created_at: string
  profiles: { full_name: string; avatar_url: string | null } | null
  communities: { slug: string; name: string } | null
  post_likes: { profile_id: string }[]
}

type Project = {
  id: string
  title: string
  description: string
  discipline: string | null
  media: MediaItem[] | null
  created_at: string
  owner_id: string
  profiles: { full_name: string } | null
  communities: { slug: string; name: string } | null
  project_skills: { skills: { name: string } | null }[]
  applications: { applicant_id: string }[]
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string; sort?: string; type?: string }>
}) {
  const { community: communitySlug, sort = 'new', type = 'projects' } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Only communities the user has joined show up here at all — joining
  // happens on /communities. This keeps the explore feed scoped to what
  // you're actually a member of, not a global firehose.
  const { data: joined } = await supabase
    .from('community_members')
    .select('communities(id, slug, name)')
    .eq('profile_id', user.id)
    .returns<{ communities: Community }[]>()

  const communities = (joined ?? []).map((j) => j.communities).sort((a, b) => a.name.localeCompare(b.name))
  const joinedIds = new Set(communities.map((c) => c.id))
  const activeCommunity = communities.find((c) => c.slug === communitySlug) ?? null
  const communityIds = activeCommunity ? [activeCommunity.id] : [...joinedIds]

  let posts: Post[] = []
  let projects: Project[] = []
  let error: { message: string } | null = null

  if (communities.length > 0 && type === 'posts') {
    const { data, error: queryError } = await supabase
      .from('posts')
      .select('id, community_id, content, created_at, profiles!posts_author_id_fkey(full_name, avatar_url), communities(slug, name), post_likes(profile_id)')
      .in('community_id', communityIds)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<Post[]>()

    error = queryError
    posts = data ?? []
    // ponytail: sorting "popular" in JS rather than a DB view/RPC — fine at
    // this scale, revisit with a real ranking query if the feed grows large.
    if (sort === 'popular') posts = [...posts].sort((a, b) => b.post_likes.length - a.post_likes.length)
  } else if (communities.length > 0) {
    const { data, error: queryError } = await supabase
      .from('projects')
      .select('id, title, description, discipline, media, created_at, owner_id, profiles!projects_owner_id_fkey(full_name), communities(slug, name), project_skills(skills(name)), applications(applicant_id)')
      .in('community_id', communityIds)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<Project[]>()

    error = queryError
    projects = data ?? []
    if (sort === 'popular') projects = [...projects].sort((a, b) => b.applications.length - a.applications.length)
  }

  function pageHref(overrides: { type?: string; sort?: string; community?: string | null }) {
    const params = new URLSearchParams()
    params.set('type', overrides.type ?? type)
    params.set('sort', overrides.sort ?? sort)
    const community = overrides.community === null ? undefined : (overrides.community ?? activeCommunity?.slug)
    if (community) params.set('community', community)
    return `/explore?${params.toString()}`
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Explore</h1>
        <div className="flex items-center gap-4">
          <Link href="/communities" className="text-sm text-neutral-500 hover:underline">
            Find communities
          </Link>
          <Link
            href={activeCommunity ? `/explore/new?community=${activeCommunity.slug}` : '/explore/new'}
            className="rounded-full bg-neutral-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            New post
          </Link>
        </div>
      </div>

      {communities.length === 0 ? (
        <p className="mt-8 text-center text-neutral-500">
          You haven&apos;t joined any communities yet.{' '}
          <Link href="/communities" className="underline">Browse communities</Link> to get started.
        </p>
      ) : (
        <>
          <div className="mt-4 flex gap-2 text-sm">
            <Link href={pageHref({ type: 'projects' })} className={`rounded-full px-3 py-1 ${type === 'projects' ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900' : 'border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'}`}>
              Projects
            </Link>
            <Link href={pageHref({ type: 'posts' })} className={`rounded-full px-3 py-1 ${type === 'posts' ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900' : 'border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'}`}>
              Posts
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={pageHref({ community: null })}
              className={`rounded-full px-3 py-1 text-sm ${!activeCommunity ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900' : 'border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'}`}
            >
              All
            </Link>
            {communities.map((c) => (
              <Link
                key={c.id}
                href={pageHref({ community: c.slug })}
                className={`rounded-full px-3 py-1 text-sm ${activeCommunity?.id === c.id ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900' : 'border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'}`}
              >
                {c.name}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-3 text-sm">
              <Link href={pageHref({ sort: 'new' })} className={sort === 'new' ? 'font-semibold' : 'text-neutral-500'}>
                New
              </Link>
              <Link href={pageHref({ sort: 'popular' })} className={sort === 'popular' ? 'font-semibold' : 'text-neutral-500'}>
                Popular
              </Link>
            </div>
            {activeCommunity && (
              <JoinButton communityId={activeCommunity.id} initialJoined={joinedIds.has(activeCommunity.id)} />
            )}
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-4 text-red-500">Could not load {type}: {error.message}</p>}

      {communities.length > 0 && !error && type === 'posts' && (
        posts.length === 0 ? (
          <p className="mt-8 text-center text-neutral-500">No posts here yet — be the first.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {posts.map((post) => {
              const liked = post.post_likes.some((l) => l.profile_id === user.id)
              return (
                <article key={post.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {post.profiles?.full_name ?? 'Unknown'}
                    </span>
                    {!activeCommunity && post.communities && (
                      <>
                        <span>·</span>
                        <Link href={pageHref({ community: post.communities.slug })} className="hover:underline">
                          {post.communities.name}
                        </Link>
                      </>
                    )}
                    <span>·</span>
                    <span>{timeAgo(post.created_at)} ago</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{post.content}</p>
                  <div className="mt-3">
                    <LikeButton postId={post.id} initialLiked={liked} initialCount={post.post_likes.length} />
                  </div>
                </article>
              )
            })}
          </div>
        )
      )}

      {communities.length > 0 && !error && type === 'projects' && (
        projects.length === 0 ? (
          <p className="mt-8 text-center text-neutral-500">No projects here yet — be the first to post one.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {projects.map((project) => {
              const cover = project.media?.[0]
              const applied = project.applications.some((a) => a.applicant_id === user.id)
              return (
                <article key={project.id} className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                  {cover && (
                    <div className="flex aspect-video items-center justify-center bg-neutral-100 dark:bg-neutral-900">
                      {isVideo(cover) ? (
                        <video src={cover.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {project.profiles?.full_name ?? 'Unknown'}
                      </span>
                      {!activeCommunity && project.communities && (
                        <>
                          <span>·</span>
                          <Link href={pageHref({ community: project.communities.slug })} className="hover:underline">
                            {project.communities.name}
                          </Link>
                        </>
                      )}
                      <span>·</span>
                      <span>{timeAgo(project.created_at)} ago</span>
                    </div>

                    <div>
                      <p className="font-semibold">{project.title}</p>
                      {project.discipline && <p className="text-sm text-neutral-500">{project.discipline}</p>}
                    </div>

                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{project.description}</p>

                    {project.project_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {project.project_skills.map((ps) => ps.skills && (
                          <span key={ps.skills.name} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {ps.skills.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
                      <span className="text-sm text-neutral-500">
                        {project.applications.length} interested
                      </span>
                      {project.owner_id !== user.id && (
                        <ApplyButton projectId={project.id} initialApplied={applied} />
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )
      )}
    </main>
  )
}
