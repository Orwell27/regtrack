import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { AlertaCard } from '@/app/components/ui/AlertaCard'
import { FilterBar } from '@/app/components/ui/FilterBar'
import { MapaEspaña } from '@/components/subscriber/MapaEspaña'

export const dynamic = 'force-dynamic'

type SearchParams = { fuente?: string; urgencia?: string; page?: string }

const PAGE_SIZE = 20

export default async function SubscriberAlertasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [user, params] = await Promise.all([getAuthUser(), searchParams])

  if (!user) redirect('/login')

  const page = parseInt(params.page ?? '1') - 1
  const fuentes = params.fuente?.split(',').filter(Boolean)
  const db = createNextServerClient()

  let query = db
    .from('alertas')
    .select('*', { count: 'exact' })
    .eq('estado', 'enviada')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (fuentes?.length) query = query.in('fuente', fuentes)
  if (params.urgencia && params.urgencia !== 'all') query = query.eq('urgencia', params.urgencia)

  const { data: alertas, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Compute map stats for heatmap
  const today = new Date().toISOString().slice(0, 10)
  // TODO: replace with a DB-side aggregate query when alert volume grows
  const { data: statsRows } = await db
    .from('alertas')
    .select('fuente, created_at')
    .eq('estado', 'enviada')
    .limit(10000)

  const countByFuente: Record<string, number> = {}
  const todayFuentesSet = new Set<string>()
  for (const row of statsRows ?? []) {
    if (!row.fuente) continue
    countByFuente[row.fuente] = (countByFuente[row.fuente] ?? 0) + 1
    if (row.created_at?.startsWith(today)) todayFuentesSet.add(row.fuente)
  }
  const maxCount = Math.max(1, ...Object.values(countByFuente))
  const mapStats = { countByFuente, todayFuentes: [...todayFuentesSet], maxCount }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Mis alertas</h1>
        <p className="text-sm text-slate-400">{count ?? 0} alertas</p>
      </div>

      <MapaEspaña stats={mapStats} />

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: 'urgencia',
              placeholder: 'Urgencia',
              options: [
                { value: 'alta', label: 'Alta' },
                { value: 'media', label: 'Media' },
                { value: 'baja', label: 'Baja' },
              ],
            },
          ]}
        />
      </div>

      {!alertas?.length ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-400 text-sm">No hay alertas disponibles todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map(alerta => (
            <AlertaCard key={alerta.id} alerta={alerta} plan={user.plan} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`?${new URLSearchParams({ ...params, page: String(p) })}`}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                p === page + 1
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
