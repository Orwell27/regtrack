import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { SubscriberSidebar } from '@/app/components/layouts/SubscriberSidebar'

export default async function SubscriberLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) redirect('/login')
  if (user.rol !== 'subscriber') redirect('/admin/dashboard')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden md:flex">
        <SubscriberSidebar nombre={user.nombre} plan={user.plan} />
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
