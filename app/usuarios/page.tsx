import { createNextServerClient } from '@/lib/supabase'
import UsuarioRow from './UsuarioRow'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const db = createNextServerClient()
  const { data: usuarios } = await db
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Usuarios</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Telegram ID</th>
              <th className="text-left p-3">Territorios</th>
              <th className="text-left p-3">Subtemas</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Activo</th>
              <th className="text-left p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios?.map(u => <UsuarioRow key={u.id} usuario={u} />)}
          </tbody>
        </table>
      </div>
    </main>
  )
}
