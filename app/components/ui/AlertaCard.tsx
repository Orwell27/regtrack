import Link from 'next/link'
import { ArrowUpRight, CalendarDays } from 'lucide-react'
import type { Alerta, Plan } from '@/lib/supabase'
import { formatAlertDate, topicLabel, URGENCY } from '@/lib/alertas-ui'

type Props = { alerta: Alerta; plan: Plan; relevante?: boolean; subcategorias?: Array<{ nombre: string; slug: string }>; returnTo?: string }

export function AlertaCard({ alerta, plan, relevante, subcategorias = [], returnTo }: Props) {
  const urgency = alerta.urgencia ? URGENCY[alerta.urgencia] : null
  const href = `/alerta/${alerta.id}${returnTo ? `?volver=${encodeURIComponent(returnTo)}` : ''}`
  return (
    <article className="rt-alert-card">
      <div className="rt-alert-content">
        <div className="rt-eyebrow-row">
          <span className="rt-topic">{topicLabel(alerta.subtema)}</span>
          {urgency && <span className={`rt-badge ${urgency.className}`}>{urgency.label}</span>}
          {relevante && <span className="rt-relevant">Coincide con tus intereses</span>}
        </div>
        <h2 className="rt-alert-title"><Link href={href}>{alerta.resumen || alerta.titulo}</Link></h2>
        <p className="rt-official-title" title={alerta.titulo}>{alerta.titulo}</p>
        {plan === 'pro' && alerta.accion_recomendada && (
          <div className="rt-next-step"><span>Siguiente paso</span><p>{alerta.accion_recomendada}</p></div>
        )}
        <div className="rt-card-footer">
          <span>{alerta.fuente}<span aria-hidden="true"> · </span>{alerta.territorios?.join(', ') || 'Ámbito sin especificar'}</span>
          {subcategorias.length > 0 && <span>{subcategorias.map(s => s.nombre).join(' · ')}</span>}
        </div>
      </div>
      <div className="rt-alert-aside">
        <div className="rt-date"><CalendarDays size={17} aria-hidden="true" /><div><span>{alerta.fecha_entrada_vigor ? 'Entrada en vigor' : 'Publicación'}</span><strong>{formatAlertDate(alerta.fecha_entrada_vigor || alerta.fecha_publicacion)}</strong></div></div>
        <Link className="rt-open-alert" href={href}>Ver análisis <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </div>
    </article>
  )
}
