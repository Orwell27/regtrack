import { redirect } from 'next/navigation'
import { verifiedIdentity, getAuthUser } from '@/lib/auth'
import { Registration } from '@/components/Registration'
export const dynamic = 'force-dynamic'
export default async function RegisterPage() {
  const profile = await getAuthUser()
  if (profile) redirect('/alertas')
  const identity = await verifiedIdentity()
  return <Registration email={identity?.email} />
}
