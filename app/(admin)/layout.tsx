import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { AdminSidebar } from '@/app/components/layouts/AdminSidebar'
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
      <div className="hidden md:flex">
        <AdminSidebar pendientes={count ?? 0} />
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
