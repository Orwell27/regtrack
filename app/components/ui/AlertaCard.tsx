import Link from 'next/link'
import type { Alerta, Plan } from '@/lib/supabase'

const BORDER_COLOR: Record<string, string> = {
  alta: 'border-l-red-400',
  media: 'border-l-amber-400',
  baja: 'border-l-emerald-400',
}

const URGENCIA_STYLE: Record<string, string> = {
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-emerald-100 text-emerald-800',
}

type Props = {
  alerta: Alerta
  plan: Plan
}

export function AlertaCard({ alerta, plan }: Props) {
  const isPro = plan === 'pro'
  const urgencia = alerta.urgencia ?? 'baja'

  return (
    <div className={`bg-white border border-slate-200 border-l-2 ${BORDER_COLOR[urgencia]} rounded-lg p-4 space-y-2`}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-medium text-slate-900 text-sm leading-snug flex-1">{alerta.titulo}</h3>
        <div className="flex gap-1.5 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCIA_STYLE[urgencia]}`}>
            {alerta.urgencia}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {alerta.score_relevancia}/10
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span>{alerta.fuente}</span>
        <span>{alerta.subtema}</span>
        <span>{alerta.territorios?.join(', ')}</span>
      </div>

      <p className="text-xs text-slate-600 line-clamp-3">{alerta.resumen}</p>

      {isPro ? (
        <div className="text-xs space-y-1 pt-1">
          <p className="text-sky-700"><strong>Impacto:</strong> {alerta.impacto}</p>
          <p className="text-slate-600"><strong>Acción:</strong> {alerta.accion_recomendada}</p>
        </div>
      ) : (
        <div className="bg-sky-50 border border-sky-100 rounded-md p-2.5 text-center">
          <p className="text-xs font-semibold text-sky-700 mb-0.5">🔒 Análisis completo en Pro</p>
          <p className="text-[11px] text-slate-500">Impacto, acción recomendada y plazos</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-slate-400">
          {alerta.fecha_publicacion
            ? new Date(alerta.fecha_publicacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
            : ''}
        </span>
        <Link
          href={`/alerta/${alerta.id}`}
          className="text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  )
}
