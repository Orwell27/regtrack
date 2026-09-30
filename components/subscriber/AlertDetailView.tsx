import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, BookOpen, CalendarDays } from 'lucide-react'
import type { Alerta, Plan } from '@/lib/supabase'
import type { RelacionConAlerta } from '@/lib/correlacion/types'
import { formatAlertDate, topicLabel, URGENCY } from '@/lib/alertas-ui'
import { TimelineNormativa } from './TimelineNormativa'
import { ListaRelaciones } from './ListaRelaciones'

export function AlertDetailView({ alerta, plan, relaciones, returnTo = '/alertas' }: { alerta: Alerta; plan: Plan; relaciones: RelacionConAlerta[]; returnTo?: string }) {
  const isPro = plan === 'pro'
  const urgency = alerta.urgencia ? URGENCY[alerta.urgencia] : null
  return <div className="rt-workspace rt-detail">
    <Link className="rt-back" href={returnTo}><ArrowLeft size={17} aria-hidden="true" /> Volver a las alertas</Link>
    <header className="rt-detail-header">
      <div className="rt-eyebrow-row"><span className="rt-topic">{topicLabel(alerta.subtema)}</span>{urgency && <span className={`rt-badge ${urgency.className}`}>{urgency.label}</span>}</div>
      <h1>{alerta.titulo}</h1>
      <p>{alerta.fuente} · Publicado el {formatAlertDate(alerta.fecha_publicacion)}</p>
    </header>
    <div className="rt-detail-grid">
      <div className="rt-reading">
        <section className="rt-reading-section"><p className="rt-section-number">01 / EL CAMBIO</p><h2>Qué cambia</h2><p className="rt-summary">{alerta.resumen || 'Todavía no hay un resumen disponible. Consulta el documento oficial.'}</p></section>
        {isPro ? <>
          <section className="rt-reading-section"><p className="rt-section-number">02 / EL IMPACTO</p><h2>Cómo puede afectarte</h2><p>{alerta.impacto || 'El impacto no está especificado en este análisis.'}</p>{alerta.afectados?.length > 0 && <div className="rt-affected"><span>Perfiles afectados</span><p>{alerta.afectados.map(topicLabel).join(' · ')}</p></div>}</section>
          <section className="rt-action-section"><p className="rt-section-number">03 / TU SIGUIENTE PASO</p><h2>Qué hacer ahora</h2><p>{alerta.accion_recomendada || 'No se ha indicado una acción concreta. Revisa la fuente oficial para valorar tu caso.'}</p><a href={alerta.url} target="_blank" rel="noopener noreferrer">Consultar la fuente <ArrowUpRight size={17} aria-hidden="true" /></a></section>
        </> : <aside className="rt-pro-banner rt-pro-detail"><div><strong>Entiende el impacto. Decide el siguiente paso.</strong><p>Con Pro puedes consultar los perfiles afectados, la acción recomendada y la evolución de esta normativa.</p></div><Link href="/cuenta#planes">Conocer Pro ↗</Link></aside>}
        <section className="rt-reading-section" id="fuente"><p className="rt-section-number">FUENTE Y CONTEXTO</p><h2>Consulta el documento original</h2><a className="rt-source-link" href={alerta.url} target="_blank" rel="noopener noreferrer"><BookOpen size={20} aria-hidden="true" /><span>{alerta.fuente}<strong>{alerta.titulo}</strong></span><ArrowUpRight size={18} aria-hidden="true" /></a>
          {isPro && alerta.deroga_modifica && <details className="rt-context"><summary>Qué normativa modifica o deroga</summary><p>{alerta.deroga_modifica}</p></details>}
          {isPro && relaciones.length > 0 && <details className="rt-context"><summary>Evolución normativa · {relaciones.length} relaciones</summary><TimelineNormativa relaciones={relaciones} alertaActualId={alerta.id} alertaActualTitulo={alerta.titulo} alertaActualFecha={alerta.fecha_publicacion} /><ListaRelaciones relaciones={relaciones} alertaActualId={alerta.id} /></details>}
        </section>
      </div>
      <aside className="rt-facts" aria-label="Datos de la norma">
        <div className="rt-facts-heading"><CalendarDays size={19} aria-hidden="true" /><h2>Fechas y alcance</h2></div>
        <dl>
          <div><dt>Entrada en vigor</dt><dd>{formatAlertDate(alerta.fecha_entrada_vigor)}</dd></div>
          <div><dt>Plazo de adaptación</dt><dd>{alerta.plazo_adaptacion == null ? 'Sin plazo indicado' : alerta.plazo_adaptacion === 0 ? 'Aplicación inmediata' : `${alerta.plazo_adaptacion} días`}</dd></div>
          <div><dt>Territorios indicados</dt><dd>{alerta.territorios?.join(', ') || 'Sin especificar'}</dd></div>
          <div><dt>Tipo de norma</dt><dd>{alerta.tipo_norma || 'Sin especificar'}</dd></div>
        </dl>
        <p className="rt-facts-note">El plazo de adaptación no es una cuenta atrás. Comprueba las fechas y condiciones en la fuente.</p>
      </aside>
    </div>
    <footer className="rt-page-footer">RegTrack <span>De la publicación oficial a una lectura comprensible.</span></footer>
  </div>
}
