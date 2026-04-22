'use client'
import { useEffect, useState } from 'react'
import type { RelacionConAlerta } from '@/lib/correlacion/types'

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  progresion:  { label: 'PROGRESIÓN',  className: 'bg-sky-100 text-sky-700' },
  deroga:      { label: 'DEROGA',      className: 'bg-red-100 text-red-700' },
  modifica:    { label: 'MODIFICA',    className: 'bg-orange-100 text-orange-700' },
  complementa: { label: 'COMPLEMENTA', className: 'bg-emerald-100 text-emerald-700' },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CardNormativaRelacionada({ alertaId }: { alertaId: string }) {
  const [relaciones, setRelaciones] = useState<RelacionConAlerta[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/alertas/${alertaId}/relaciones`)
      .then(r => r.json())
      .then(({ relaciones }) => setRelaciones(relaciones))
      .catch(() => {
        setError(true)
        setRelaciones([])
      })
  }, [alertaId])

  if (relaciones === null) return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Normativa relacionada</p>
      <p className="text-xs text-slate-400">Cargando...</p>
    </div>
  )

  if (error) return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Normativa relacionada</p>
      <p className="text-xs text-red-400">Error al cargar normativa relacionada</p>
    </div>
  )

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Normativa relacionada
      </p>
      {relaciones.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No se han detectado normativas relacionadas</p>
      ) : (
        <ul className="space-y-2">
          {relaciones.map(r => {
            const otherId = r.alerta_id === alertaId ? r.alerta_relacionada_id : r.alerta_id
            const badge = TIPO_BADGE[r.tipo_relacion] ?? TIPO_BADGE.progresion
            return (
              <li key={r.id} className="flex items-start gap-2 text-xs">
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
                  {badge.label}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/alerta/${otherId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-700 hover:text-sky-600 font-medium line-clamp-1"
                  >
                    {r.titulo}
                  </a>
                  <p className="text-slate-400">
                    {r.fuente} · {fmtDate(r.fecha_publicacion)} · Score: {r.score_similitud}
                  </p>
                  {r.razon && <p className="text-slate-500 italic line-clamp-1">{r.razon}</p>}
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-sky-600 hover:underline"
                >
                  Ver ↗
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
