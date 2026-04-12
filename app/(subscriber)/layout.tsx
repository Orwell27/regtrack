import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { SubscriberSidebar } from '@/app/components/layouts/SubscriberSidebar'
import { MobileNav } from '@/app/components/layouts/MobileNav'

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
        <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
          <MobileNav sidebar={<SubscriberSidebar nombre={user.nombre} plan={user.plan} />} />
          <span className="font-bold text-sm text-slate-900">RegTrack</span>
        </div>
        {children}
      </main>
    </div>
  )
}
