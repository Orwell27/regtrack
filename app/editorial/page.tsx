import { createNextServerClient } from '@/lib/supabase'
import AlertaCard from './AlertaCard'

export default async function EditorialPage() {
  const db = createNextServerClient()
  const { data: alertas } = await db
    .from('alertas')
    .select('*')
    .eq('estado', 'pendiente_revision')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Cola editorial</h1>
      {!alertas?.length && (
        <p className="text-gray-500">No hay alertas pendientes de revisión.</p>
      )}
      <div className="space-y-6">
        {alertas?.map(alerta => (
          <AlertaCard key={alerta.id} alerta={alerta} />
        ))}
      </div>
    </main>
  )
}
