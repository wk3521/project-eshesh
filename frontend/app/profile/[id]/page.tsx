import Profile from '@/app/pages/Profile'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <Profile profileId={id} />
}
