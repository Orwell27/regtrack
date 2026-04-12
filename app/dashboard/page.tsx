import { createNextServerClient } from '@/lib/supabase'

async function getStats() {
  const db = createNextServerClient()
  const today = new Date().toISOString().slice(0, 10)

  const [alertasHoy, pendientes, aprobadas, enviadas, usuarios] = await Promise.all([
    db.from('alertas').select('id', { count: 'exact' }).gte('created_at', `${today}T00:00:00Z`),
    db.from('alertas').select('id', { count: 'exact' }).eq('estado', 'pendiente_revision'),
    db.from('alertas').select('id', { count: 'exact' }).eq('estado', 'aprobada'),
    db.from('alertas').select('id', { count: 'exact' }).eq('estado', 'enviada'),
    db.from('usuarios').select('id, plan', { count: 'exact' }).eq('activo', true),
  ])

  const usuariosFree = (usuarios.data ?? []).filter(u => u.plan === 'free').length
  const usuariosPro = (usuarios.data ?? []).filter(u => u.plan === 'pro').length

  return {
    alertasHoy: alertasHoy.count ?? 0,
    pendientes: pendientes.count ?? 0,
    aprobadas: aprobadas.count ?? 0,
    enviadas: enviadas.count ?? 0,
    usuariosFree,
    usuariosPro,
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const cards = [
    { label: 'Procesadas hoy', value: stats.alertasHoy, color: 'blue' },
    { label: 'Pendientes revisión', value: stats.pendientes, color: 'yellow' },
    { label: 'Aprobadas', value: stats.aprobadas, color: 'green' },
    { label: 'Enviadas', value: stats.enviadas, color: 'gray' },
    { label: 'Usuarios Free', value: stats.usuariosFree, color: 'purple' },
    { label: 'Usuarios Pro', value: stats.usuariosPro, color: 'orange' },
  ]

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(card => (
          <div key={card.label} className="border rounded-lg p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
