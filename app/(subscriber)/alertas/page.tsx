import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { AlertaCard } from '@/app/components/ui/AlertaCard'
import { FilterBar } from '@/app/components/ui/FilterBar'

export const dynamic = 'force-dynamic'

type SearchParams = { fuente?: string; urgencia?: string; page?: string }

const PAGE_SIZE = 20

export default async function SubscriberAlertasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [user, params] = await Promise.all([getAuthUser(), searchParams])

  if (!user) redirect('/login')

  const page = parseInt(params.page ?? '1') - 1
  const db = createNextServerClient()

  let query = db
    .from('alertas')
    .select('*', { count: 'exact' })
    .eq('estado', 'enviada')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (params.fuente && params.fuente !== 'all') query = query.eq('fuente', params.fuente)
  if (params.urgencia && params.urgencia !== 'all') query = query.eq('urgencia', params.urgencia)

  const { data: alertas, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Mis alertas</h1>
        <p className="text-sm text-slate-400">{count ?? 0} alertas</p>
      </div>

      <div className="mb-4">
        <FilterBar
          filters={[
            { key: 'fuente', placeholder: 'Fuente', options: [
              { value: 'BOE',           label: 'BOE — Estatal' },
              { value: 'BOCM',          label: 'BOCM — Madrid' },
              { value: 'DOGC',          label: 'DOGC — Cataluña' },
              { value: 'BORM',          label: 'BORM — Murcia' },
              { value: 'BOJA',          label: 'BOJA — Andalucía' },
              { value: 'BOIB',          label: 'BOIB — Baleares' },
              { value: 'BOC_CANARIAS',  label: 'BOC — Canarias' },
              { value: 'BOC_CANTABRIA', label: 'BOC — Cantabria' },
              { value: 'BOCYL',         label: 'BOCYL — Castilla y León' },
              { value: 'DOE',           label: 'DOE — Extremadura' },
              { value: 'DOG',           label: 'DOG — Galicia' },
              { value: 'BOPV',          label: 'BOPV — País Vasco' },
              { value: 'BOPA',          label: 'BOPA — Asturias' },
              { value: 'BON',           label: 'BON — Navarra' },
              { value: 'BOR',           label: 'BOR — La Rioja' },
            ]},
            { key: 'urgencia', placeholder: 'Urgencia', options: [
              { value: 'alta', label: 'Alta' },
              { value: 'media', label: 'Media' },
              { value: 'baja', label: 'Baja' },
            ]},
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
