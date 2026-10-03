import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/time'

type Actor = { id: string; full_name: string; avatar_url: string | null }

type Notification =
  | { kind: 'like'; id: string; created_at: string; actor: Actor; postContent: string }
  | { kind: 'application'; id: string; created_at: string; actor: Actor; projectId: string; projectTitle: string }
  | { kind: 'follow'; id: string; created_at: string; actor: Actor }

type LikedPost = {
  content: string
  post_likes: { created_at: string; profiles: Actor | null }[]
}

type AppliedProject = {
  id: string
  title: string
  applications: { id: string; created_at: string; profiles: Actor | null }[]
}

type Follow = {
  created_at: string
  profiles: Actor | null
}

// ponytail: notifications are computed live from existing tables rather than
// a dedicated notifications table — no persisted read/unread state or history
// if the underlying like/application/follow is removed. Add a real
// notifications table (with a trigger) if you need either of those later.
export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: likedPosts }, { data: appliedProjects }, { data: follows }] = await Promise.all([
    supabase
      .from('posts')
      .select('content, post_likes(created_at, profiles!post_likes_profile_id_fkey(id, full_name, avatar_url))')
      .eq('author_id', user.id)
      .returns<LikedPost[]>(),
    supabase
      .from('projects')
      .select('id, title, applications(id, created_at, profiles!applications_applicant_id_fkey(id, full_name, avatar_url))')
      .eq('owner_id', user.id)
      .returns<AppliedProject[]>(),
    supabase
      .from('follows')
      .select('created_at, profiles!follows_follower_id_fkey(id, full_name, avatar_url)')
      .eq('followed_id', user.id)
      .returns<Follow[]>(),
  ])

  const notifications: Notification[] = []

  for (const post of likedPosts ?? []) {
    for (const like of post.post_likes) {
      if (like.profiles && like.profiles.id !== user.id) {
        notifications.push({ kind: 'like', id: `${like.profiles.id}-${like.created_at}`, created_at: like.created_at, actor: like.profiles, postContent: post.content })
      }
    }
  }

  for (const project of appliedProjects ?? []) {
    for (const application of project.applications) {
      if (application.profiles) {
        notifications.push({ kind: 'application', id: application.id, created_at: application.created_at, actor: application.profiles, projectId: project.id, projectTitle: project.title })
      }
    }
  }

  for (const follow of follows ?? []) {
    if (follow.profiles) {
      notifications.push({ kind: 'follow', id: `${follow.profiles.id}-${follow.created_at}`, created_at: follow.created_at, actor: follow.profiles })
    }
  }

  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold">Notifications</h1>

      {notifications.length === 0 ? (
        <p className="mt-8 text-center text-neutral-500">Nothing yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {notifications.map((n) => (
            <div key={`${n.kind}-${n.id}`} className="flex items-start justify-between gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="text-sm">
                <Link href={`/profile/${n.actor.id}`} className="font-medium hover:underline">
                  {n.actor.full_name}
                </Link>{' '}
                {n.kind === 'like' && <>liked your post: &quot;{n.postContent.slice(0, 80)}{n.postContent.length > 80 ? '…' : ''}&quot;</>}
                {n.kind === 'application' && (
                  <>applied to collaborate on{' '}<Link href={`/projects/${n.projectId}`} className="underline">{n.projectTitle}</Link></>
                )}
                {n.kind === 'follow' && <>started following you</>}
              </p>
              <span className="shrink-0 text-sm text-neutral-400">{timeAgo(n.created_at)} ago</span>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
