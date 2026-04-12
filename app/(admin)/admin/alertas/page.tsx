import { createNextServerClient } from '@/lib/supabase'
import { FilterBar } from '@/app/components/ui/FilterBar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const URGENCIA_STYLE: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-emerald-100 text-emerald-800',
}

const ESTADO_STYLE: Record<string, string> = {
  pendiente_revision: 'bg-amber-50 text-amber-700',
  aprobada: 'bg-sky-50 text-sky-700',
  descartada: 'bg-slate-100 text-slate-500',
  enviada: 'bg-emerald-50 text-emerald-700',
}

type SearchParams = {
  fuente?: string
  estado?: string
  urgencia?: string
  q?: string
  page?: string
}

const PAGE_SIZE = 25

export default async function AlertasAdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1') - 1
  const db = createNextServerClient()

  let query = db
    .from('alertas')
    .select('id, titulo, fuente, urgencia, estado, score_relevancia, created_at, subtema', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (params.fuente && params.fuente !== 'all') query = query.eq('fuente', params.fuente)
  if (params.estado && params.estado !== 'all') query = query.eq('estado', params.estado)
  if (params.urgencia && params.urgencia !== 'all') query = query.eq('urgencia', params.urgencia)
  if (params.q) query = query.ilike('titulo', `%${params.q}%`)

  const { data: alertas, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Alertas</h1>
        <p className="text-sm text-slate-400">{count ?? 0} en total</p>
      </div>

      <div className="mb-4">
        <FilterBar
          searchKey="q"
          searchPlaceholder="Buscar por título..."
          filters={[
            { key: 'fuente', placeholder: 'Fuente', options: [
              { value: 'BOE', label: 'BOE' },
              { value: 'BOCM', label: 'BOCM' },
              { value: 'DOGC', label: 'DOGC' },
            ]},
            { key: 'urgencia', placeholder: 'Urgencia', options: [
              { value: 'alta', label: 'Alta' },
              { value: 'media', label: 'Media' },
              { value: 'baja', label: 'Baja' },
            ]},
            { key: 'estado', placeholder: 'Estado', options: [
              { value: 'pendiente_revision', label: 'Pendiente' },
              { value: 'aprobada', label: 'Aprobada' },
              { value: 'enviada', label: 'Enviada' },
              { value: 'descartada', label: 'Descartada' },
            ]},
          ]}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Título</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-20">Fuente</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-24">Urgencia</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-28">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-16">Score</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide w-24">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(alertas ?? []).map((a: { id: string; titulo: string; subtema: string | null; fuente: string; urgencia: string | null; estado: string; score_relevancia: number | null; created_at: string }) => (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 line-clamp-1">{a.titulo}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.subtema}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{a.fuente}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCIA_STYLE[a.urgencia ?? 'baja']}`}>
                    {a.urgencia}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_STYLE[a.estado]}`}>
                    {a.estado.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{a.score_relevancia}/10</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(a.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`?${new URLSearchParams({ ...params, page: String(p) })}`}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                p === page + 1
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
