import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { AlertaCard } from '@/app/components/ui/AlertaCard'
import { FilterBar } from '@/app/components/ui/FilterBar'
import { FiltroRegiones } from '@/components/subscriber/FiltroRegiones'

export const dynamic = 'force-dynamic'

type SearchParams = { fuente?: string; urgencia?: string; page?: string; solo_intereses?: string; subcategoria?: string }
type SubcategoriaFiltro = { id: number; slug: string; nombre: string }
type SubEntry = { alerta_id: string; subcategorias: { nombre: string; slug: string } | null }

const PAGE_SIZE = 20

export default async function SubscriberAlertasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [user, params] = await Promise.all([getAuthUser(), searchParams])

  if (!user) redirect('/login')

  const page = parseInt(params.page ?? '1') - 1
  const fuentes = params.fuente?.split(',').filter(Boolean)
  const db = createNextServerClient()

  const [interesesRes, subcatsRes] = await Promise.all([
    db.from('suscriptor_intereses').select('subcategoria_id').eq('usuario_id', user.usuarioId),
    db.from('subcategorias').select('id, slug, nombre').eq('activo', true).order('nombre'),
  ])

  const interesIds = new Set((interesesRes.data ?? []).map(i => i.subcategoria_id))
  const subcats: SubcategoriaFiltro[] = subcatsRes.data ?? []
  const subcatActiva = subcats.find(s => s.slug === params.subcategoria) ?? null

  let query = db
    .from('alertas')
    .select('*', { count: 'exact' })
    .eq('estado', 'enviada')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (fuentes?.length) query = query.in('fuente', fuentes)
  if (params.urgencia && params.urgencia !== 'all') query = query.eq('urgencia', params.urgencia)

  if (subcatActiva) {
    const { data: alertasConSub } = await db
      .from('alerta_sectores')
      .select('alerta_id')
      .eq('subcategoria_id', subcatActiva.id)
    const ids = (alertasConSub ?? []).map(r => r.alerta_id)
    query = ids.length > 0
      ? query.in('id', ids)
      : query.in('id', ['00000000-0000-0000-0000-000000000000'])
  }

  if (params.solo_intereses === 'true' && interesIds.size > 0) {
    const { data: alertasConInteres } = await db
      .from('alerta_sectores')
      .select('alerta_id')
      .in('subcategoria_id', Array.from(interesIds))
    const ids = (alertasConInteres ?? []).map(r => r.alerta_id)
    query = ids.length > 0
      ? query.in('id', ids)
      : query.in('id', ['00000000-0000-0000-0000-000000000000'])
  }

  const { data: alertas, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const alertaIds = (alertas ?? []).map(a => a.id)

  const relevantIds = new Set<string>()
  type SubMap = Record<string, Array<{ nombre: string; slug: string }>>
  let subsByAlerta: SubMap = {}

  if (alertaIds.length > 0) {
    const [relevanceRes, subsRes] = await Promise.all([
      interesIds.size > 0
        ? db.from('alerta_sectores').select('alerta_id').in('alerta_id', alertaIds).in('subcategoria_id', Array.from(interesIds))
        : Promise.resolve({ data: [] }),
      db.from('alerta_sectores').select('alerta_id, subcategorias(nombre, slug)').in('alerta_id', alertaIds),
    ])

    for (const m of relevanceRes.data ?? []) relevantIds.add(m.alerta_id)

    for (const row of ((subsRes.data ?? []) as unknown as SubEntry[])) {
      const sub = row.subcategorias
      if (!sub) continue
      if (!subsByAlerta[row.alerta_id]) subsByAlerta[row.alerta_id] = []
      subsByAlerta[row.alerta_id].push(sub)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Mis alertas</h1>
        <p className="text-sm text-slate-400">{count ?? 0} alertas</p>
      </div>

      <FiltroRegiones />

      {subcats.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sector inmobiliario</p>
          <div className="flex flex-wrap gap-1.5">
            {subcats.map(s => {
              const isActive = params.subcategoria === s.slug
              const nextParams = new URLSearchParams(
                Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>
              )
              if (isActive) {
                nextParams.delete('subcategoria')
              } else {
                nextParams.set('subcategoria', s.slug)
                nextParams.set('page', '1')
              }
              return (
                <a
                  key={s.slug}
                  href={`?${nextParams}`}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700'
                  }`}
                >
                  {s.nombre}
                </a>
              )
            })}
          </div>
        </div>
      )}

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
              ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>,
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
              subcategorias={subsByAlerta[alerta.id] ?? []}
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
