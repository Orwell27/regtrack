import Link from 'next/link'
import { ArrowLeft, ArrowRight, Radio, SearchX } from 'lucide-react'
import { AlertaCard } from '@/app/components/ui/AlertaCard'
import { AlertFilters } from './AlertFilters'
import { alertasHref, type AlertFilters as Filters } from '@/lib/alertas-ui'
import type { Alerta, Plan } from '@/lib/supabase'

type Subcategory = { nombre: string; slug: string }
export function AlertListView({ alertas, count, params, plan, subcats, interestCount, relevantIds, subsByAlerta, error = false }: {
  alertas: Alerta[]; count: number; params: Filters; plan: Plan; subcats: Subcategory[]; interestCount: number;
  relevantIds: string[]; subsByAlerta: Record<string, Subcategory[]>; error?: boolean
}) {
  const page = Number(params.page ?? 1)
  const totalPages = Math.max(1, Math.ceil(count / 20))
  const filtered = Boolean(params.q || params.fuente || params.urgencia || params.subcategoria || params.solo_intereses === 'true')
  return <div className="rt-workspace">
    <header className="rt-page-header">
      <div><p className="rt-kicker"><Radio size={16} aria-hidden="true" /> RADAR INMOBILIARIO</p><h1>La normativa, más clara.</h1><p className="rt-lead">Entiende qué cambia y encuentra tu siguiente paso.</p></div>
      <div className="rt-header-note"><span>Tu espacio de consulta</span><strong>Fuentes oficiales.<br />Contexto para decidir.</strong></div>
    </header>
    <AlertFilters key={alertasHref(params)} params={params} subcats={subcats} hasInterests={interestCount > 0} />
    <div className="rt-results-heading"><h2>{params.solo_intereses === 'true' ? 'Según tus intereses' : 'Últimas publicaciones'}</h2><span>{error ? 'Consulta no disponible' : `${count} ${count === 1 ? 'alerta' : 'alertas'}${filtered ? ' encontradas' : ' publicadas'}`} · Más recientes primero</span></div>
    {error ? <div className="rt-empty" role="alert"><h3>No hemos podido cargar las alertas</h3><p>Inténtalo de nuevo. Un error de conexión no significa que no haya novedades.</p><a className="rt-button" href={alertasHref(params)}>Volver a intentar</a></div>
    : alertas.length === 0 ? <div className="rt-empty"><SearchX size={30} aria-hidden="true" /><h3>{filtered ? 'No hay coincidencias con esta selección' : page > 1 ? 'Esta página no tiene alertas' : 'Tu radar está listo'}</h3><p>{filtered ? 'Prueba otro término o amplía los filtros para consultar más publicaciones.' : page > 1 ? 'Vuelve al principio para consultar las publicaciones disponibles.' : 'Las nuevas alertas aparecerán aquí después de su revisión editorial.'}</p>{(filtered || page > 1) && <Link href="/alertas" className="rt-button">Ver todas las alertas</Link>}</div>
    : <div className="rt-alert-list">{alertas.map(alerta => <AlertaCard key={alerta.id} alerta={alerta} plan={plan} relevante={relevantIds.includes(alerta.id)} subcategorias={subsByAlerta[alerta.id]} returnTo={alertasHref(params)} />)}</div>}
    {!error && totalPages > 1 && <nav aria-label="Páginas de alertas" className="rt-pagination">
      {page > 1 ? <Link href={alertasHref(params, {page: String(page - 1)})}><ArrowLeft size={16} aria-hidden="true" /> Anterior</Link> : <span />}
      <span>Página {page} de {totalPages}</span>
      {page < totalPages ? <Link href={alertasHref(params, {page: String(page + 1)})}>Siguiente <ArrowRight size={16} aria-hidden="true" /></Link> : <span />}
    </nav>}
    {plan === 'free' && <aside className="rt-pro-banner"><div><strong>Del cambio normativo a la acción.</strong><p>Pro añade impacto, acciones recomendadas y relaciones con otras normas.</p></div><Link href="/cuenta#planes">Conocer Pro <ArrowUpRightIcon /></Link></aside>}
    <footer className="rt-page-footer">RegTrack <span>Inteligencia normativa para el sector inmobiliario</span></footer>
  </div>
}
function ArrowUpRightIcon() { return <span aria-hidden="true">↗</span> }
