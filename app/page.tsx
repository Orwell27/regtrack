import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getAuthUser()

  if (!user) redirect('/login')
  if (user.rol === 'admin') redirect('/admin/dashboard')
  redirect('/alertas')
}
