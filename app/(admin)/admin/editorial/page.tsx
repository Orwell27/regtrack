import { createNextServerClient } from '@/lib/supabase'
import { AlertaRow } from './AlertaRow'

export const dynamic = 'force-dynamic'

export default async function EditorialPage() {
  const db = createNextServerClient()
  const { data: alertas } = await db
    .from('alertas')
    .select('*')
    .in('estado', ['pendiente_revision', 'aprobada'])
    .order('created_at', { ascending: false })

  const pendientes = alertas?.filter(a => a.estado === 'pendiente_revision') ?? []
  const aprobadas = alertas?.filter(a => a.estado === 'aprobada') ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cola editorial</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pendientes.length} pendientes · {aprobadas.length} aprobadas sin enviar</p>
        </div>
      </div>

      {pendientes.length === 0 && aprobadas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-400 text-sm">No hay alertas en cola. Ejecuta el pipeline para procesar nuevas normas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...pendientes, ...aprobadas].map(alerta => (
            <AlertaRow key={alerta.id} alerta={alerta} />
          ))}
        </div>
      )}
    </div>
  )
}
