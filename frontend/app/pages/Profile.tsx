import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileDetails from '@/app/components/ProfileDetails'
import noBackground from '@/resources/no_background.png'
import noPfp from '@/resources/no_pfp.jpg'
import styles from './Profile.module.css'

export default async function Profile({ profileId }: { profileId: string }) {
  const supabase = await createClient()

  const [{ data: profile }, { data: { user } }, { data: skills }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).maybeSingle(),
    supabase.auth.getUser(),
    supabase
      .from('skills')
      .select('id, name, profile_skills!inner()')
      .eq('profile_skills.profile_id', profileId)
      .order('name'),
  ])

  if (!profile) notFound()

  const isOwnProfile = user?.id === profile.id

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.background_url || noBackground.src} alt="" className={styles.background} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatar_url || noPfp.src}
          alt={profile.full_name ? `${profile.full_name}'s profile picture` : 'Profile picture'}
          className={styles.avatar}
        />
      </header>
      <div className={styles.profile}>
        <ProfileDetails
          profile={profile}
          skills={(skills ?? []).map(({ id, name }) => ({ id, name }))}
          isOwnProfile={isOwnProfile}
        />
      </div>
    </main>
  )
}
