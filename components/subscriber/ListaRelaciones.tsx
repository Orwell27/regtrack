// components/subscriber/ListaRelaciones.tsx
import Link from 'next/link'
import type { RelacionConAlerta } from '@/lib/correlacion/types'

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  progresion:  { label: 'PROGRESIÓN',  className: 'bg-sky-100 text-sky-700' },
  deroga:      { label: 'DEROGA',      className: 'bg-red-100 text-red-700' },
  modifica:    { label: 'MODIFICA',    className: 'bg-orange-100 text-orange-700' },
  complementa: { label: 'COMPLEMENTA', className: 'bg-emerald-100 text-emerald-700' },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface ListaRelacionesProps {
  relaciones: RelacionConAlerta[]
  alertaActualId: string
}

export function ListaRelaciones({ relaciones, alertaActualId }: ListaRelacionesProps) {
  const sorted = [...relaciones].sort((a, b) => (b.score_similitud ?? 0) - (a.score_similitud ?? 0))

  return (
    <ul className="space-y-3">
      {sorted.map(r => {
        const otherId = r.alerta_id === alertaActualId ? r.alerta_relacionada_id : r.alerta_id
        const badge = TIPO_BADGE[r.tipo_relacion] ?? TIPO_BADGE.progresion
        return (
          <li key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <Link
                href={`/alerta/${otherId}`}
                className="text-sm font-semibold text-slate-800 hover:text-sky-600 leading-snug flex-1"
              >
                {r.titulo}
              </Link>
              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">
              {r.fuente} · {fmtDate(r.fecha_publicacion)}
            </p>
            {r.razon && (
              <p className="text-xs text-slate-600 italic">{r.razon}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
