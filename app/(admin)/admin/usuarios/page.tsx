import { createNextServerClient } from '@/lib/supabase'
import { UsuarioRow } from './UsuarioRow'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const db = createNextServerClient()
  const { data: usuarios, count } = await db
    .from('usuarios')
    .select('*', { count: 'exact' })
    .eq('rol', 'subscriber')
    .order('created_at', { ascending: false })

  const activos = (usuarios ?? []).filter((u: { activo: boolean }) => u.activo).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">{activos} activos · {count ?? 0} en total</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Usuario</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Telegram ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Territorios</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Acciones</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Alta</th>
            </tr>
          </thead>
          <tbody>
            {(usuarios ?? []).map((u: import('@/lib/supabase').Usuario) => <UsuarioRow key={u.id} usuario={u} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
