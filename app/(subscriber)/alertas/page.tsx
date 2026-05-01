import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { AlertaCard } from '@/app/components/ui/AlertaCard'
import { FilterBar } from '@/app/components/ui/FilterBar'
import { FiltroRegiones } from '@/components/subscriber/FiltroRegiones'

export const dynamic = 'force-dynamic'

type SearchParams = { fuente?: string; urgencia?: string; page?: string; solo_intereses?: string }

const PAGE_SIZE = 20

export default async function SubscriberAlertasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [user, params] = await Promise.all([getAuthUser(), searchParams])

  if (!user) redirect('/login')

  const page = parseInt(params.page ?? '1') - 1
  const fuentes = params.fuente?.split(',').filter(Boolean)
  const db = createNextServerClient()

  const { data: interesesData } = await db
    .from('suscriptor_intereses')
    .select('subcategoria_id')
    .eq('usuario_id', user.usuarioId)

  const interesIds = new Set((interesesData ?? []).map(i => i.subcategoria_id))

  let query = db
    .from('alertas')
    .select('*', { count: 'exact' })
    .eq('estado', 'enviada')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (fuentes?.length) query = query.in('fuente', fuentes)
  if (params.urgencia && params.urgencia !== 'all') query = query.eq('urgencia', params.urgencia)

  if (params.solo_intereses === 'true' && interesIds.size > 0) {
    const { data: alertasConInteres } = await db
      .from('alerta_sectores')
      .select('alerta_id')
      .in('subcategoria_id', Array.from(interesIds))
    const ids = (alertasConInteres ?? []).map(r => r.alerta_id)
    if (ids.length === 0) {
      query = query.in('id', ['00000000-0000-0000-0000-000000000000'])
    } else {
      query = query.in('id', ids)
    }
  }

  const { data: alertas, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const alertaIds = (alertas ?? []).map(a => a.id)
  const relevantIds = new Set<string>()
  if (interesIds.size > 0 && alertaIds.length > 0) {
    const { data: matches } = await db
      .from('alerta_sectores')
      .select('alerta_id')
      .in('alerta_id', alertaIds)
      .in('subcategoria_id', Array.from(interesIds))
    for (const m of matches ?? []) relevantIds.add(m.alerta_id)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Mis alertas</h1>
        <p className="text-sm text-slate-400">{count ?? 0} alertas</p>
      </div>

      <FiltroRegiones />

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

      {interesIds.size > 0 && (
        <div className="mb-3">
          <a
            href={`?${new URLSearchParams({
              ...params,
              solo_intereses: params.solo_intereses === 'true' ? 'false' : 'true',
              page: '1',
            })}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              params.solo_intereses === 'true'
                ? 'bg-sky-500 text-white border-sky-500'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Solo mis intereses
          </a>
        </div>
      )}

      {!alertas?.length ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-400 text-sm">No hay alertas disponibles todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map(alerta => (
            <AlertaCard
              key={alerta.id}
              alerta={alerta}
              plan={user.plan}
              relevante={relevantIds.has(alerta.id)}
            />
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
