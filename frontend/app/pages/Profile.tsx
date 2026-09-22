import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileDetails from '@/app/components/ProfileDetails'
import styles from './Profile.module.css'

export default async function Profile({ profileId }: { profileId: string }) {
  const supabase = await createClient()

  const [{ data: profile }, { data: { user } }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).maybeSingle(),
    supabase.auth.getUser(),
  ])

  if (!profile) notFound()

  const isOwnProfile = user?.id === profile.id

  return (
    <main className={styles.profile}>
      {profile.avatar_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" className={styles.avatar} />
      )}
      <ProfileDetails profile={profile} isOwnProfile={isOwnProfile} />
    </main>
  )
}
