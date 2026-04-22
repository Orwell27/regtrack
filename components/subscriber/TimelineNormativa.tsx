// components/subscriber/TimelineNormativa.tsx
import Link from 'next/link'
import type { RelacionConAlerta } from '@/lib/correlacion/types'

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  progresion:  { label: 'PROGRESIÓN',  className: 'bg-sky-100 text-sky-700' },
  deroga:      { label: 'DEROGA',      className: 'bg-red-100 text-red-700' },
  modifica:    { label: 'MODIFICA',    className: 'bg-orange-100 text-orange-700' },
  complementa: { label: 'COMPLEMENTA', className: 'bg-emerald-100 text-emerald-700' },
}

interface TimelineNormativaProps {
  relaciones: RelacionConAlerta[]
  alertaActualId: string
  alertaActualTitulo: string
  alertaActualFecha: string | null
}

function fmtMes(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
}

export function TimelineNormativa({
  relaciones,
  alertaActualId,
  alertaActualTitulo,
  alertaActualFecha,
}: TimelineNormativaProps) {
  const nodes = [
    ...relaciones.map(r => ({
      id: r.alerta_id === alertaActualId ? r.alerta_relacionada_id : r.alerta_id,
      titulo: r.titulo,
      fecha: r.fecha_publicacion,
      fuente: r.fuente,
      tipo_relacion: r.tipo_relacion,
      esCurrent: false,
    })),
    {
      id: alertaActualId,
      titulo: alertaActualTitulo,
      fecha: alertaActualFecha,
      fuente: '',
      tipo_relacion: null,
      esCurrent: true,
    },
  ].sort((a, b) => {
    if (!a.fecha) return -1
    if (!b.fecha) return 1
    return a.fecha.localeCompare(b.fecha)
  })

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
      <ol className="space-y-5">
        {nodes.map((node) => {
          const badge = node.tipo_relacion ? TIPO_BADGE[node.tipo_relacion] : null
          return (
            <li key={node.id} className="relative">
              <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 ${
                node.esCurrent
                  ? 'bg-sky-500 border-sky-500'
                  : 'bg-white border-slate-300'
              }`} />
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">{fmtMes(node.fecha)}</p>
                {node.esCurrent ? (
                  <p className="text-sm font-bold text-slate-900 leading-snug">{node.titulo}</p>
                ) : (
                  <Link
                    href={`/alerta/${node.id}`}
                    className="text-sm font-medium text-slate-700 hover:text-sky-600 leading-snug line-clamp-2 block"
                  >
                    {node.titulo}
                  </Link>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {node.fuente && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {node.fuente}
                    </span>
                  )}
                  {badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                  {node.esCurrent && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">
                      ESTA NORMA
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
