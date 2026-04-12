import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { AdminSidebar } from '@/app/components/layouts/AdminSidebar'
import { MobileNav } from '@/app/components/layouts/MobileNav'
import { createNextServerClient } from '@/lib/supabase'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) redirect('/login')
  if (user.rol !== 'admin') redirect('/alertas')

  const db = createNextServerClient()
  const { count } = await db
    .from('alertas')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente_revision')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <AdminSidebar pendientes={count ?? 0} />
      </div>
      <main className="flex-1 overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
          <MobileNav sidebar={<AdminSidebar pendientes={count ?? 0} />} />
          <span className="font-bold text-sm text-slate-900">RegTrack</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">Admin</span>
        </div>
        {children}
      </main>
    </div>
  )
}
