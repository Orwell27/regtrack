import { createNextServerClient } from '@/lib/supabase'
import { StatCard } from '@/app/components/ui/StatCard'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStats() {
  const db = createNextServerClient()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const [hoy, ayer, pendientes, enviadas, usuarios] = await Promise.all([
    db.from('alertas').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00Z`),
    db.from('alertas').select('id', { count: 'exact', head: true })
      .gte('created_at', `${yesterday}T00:00:00Z`)
      .lt('created_at', `${today}T00:00:00Z`),
    db.from('alertas').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente_revision'),
    db.from('alertas').select('id', { count: 'exact', head: true }).eq('estado', 'enviada'),
    db.from('usuarios').select('id, plan', { count: 'exact' }).eq('activo', true),
  ])

  const countHoy = hoy.count ?? 0
  const countAyer = ayer.count ?? 1
  const trendPct = Math.round(((countHoy - countAyer) / (countAyer || 1)) * 100)
  const trend = countHoy > countAyer ? 'up' : countHoy < countAyer ? 'down' : 'neutral'
  const usuarioData = usuarios.data ?? []

  return {
    alertasHoy: countHoy,
    trendSub: `${trendPct >= 0 ? '+' : ''}${trendPct}% vs ayer`,
    trend,
    pendientes: pendientes.count ?? 0,
    enviadas: enviadas.count ?? 0,
    usuariosFree: usuarioData.filter((u: { plan: string }) => u.plan === 'free').length,
    usuariosPro: usuarioData.filter((u: { plan: string }) => u.plan === 'pro').length,
    totalUsuarios: usuarioData.length,
  }
}

async function getPendientesPreview() {
  const db = createNextServerClient()
  const { data } = await db
    .from('alertas')
    .select('id, titulo, fuente, urgencia, score_relevancia')
    .eq('estado', 'pendiente_revision')
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

const URGENCIA_STYLE: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-emerald-100 text-emerald-800',
}

export default async function DashboardPage() {
  const [stats, pendientes] = await Promise.all([getStats(), getPendientesPreview()])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <form action="/api/pipeline/run" method="POST">
          <button
            type="submit"
            className="text-sm border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600 transition-colors"
          >
            ↻ Ejecutar pipeline
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Procesadas hoy" value={stats.alertasHoy} sub={stats.trendSub} trend={stats.trend as 'up' | 'down' | 'neutral'} />
        <StatCard label="Pendientes" value={stats.pendientes} sub="Requieren revisión" />
        <StatCard label="Enviadas" value={stats.enviadas} sub="A suscriptores" />
        <StatCard label="Usuarios activos" value={stats.totalUsuarios} sub={`${stats.usuariosPro} Pro · ${stats.usuariosFree} Free`} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Cola editorial reciente</h2>
          <Link href="/admin/editorial" className="text-xs text-sky-600 hover:text-sky-700">
            Ver todo →
          </Link>
        </div>
        {pendientes.length === 0 ? (
          <p className="text-sm text-slate-400 p-4">No hay alertas pendientes.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {pendientes.map((alerta: { id: string; titulo: string; fuente: string; urgencia: string | null; score_relevancia: number | null }) => (
              <div key={alerta.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${URGENCIA_STYLE[alerta.urgencia ?? 'baja']}`}>
                  {alerta.urgencia}
                </span>
                <p className="text-sm text-slate-700 flex-1 truncate">{alerta.titulo}</p>
                <span className="text-xs text-slate-400 shrink-0">{alerta.fuente} · {alerta.score_relevancia}/10</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
