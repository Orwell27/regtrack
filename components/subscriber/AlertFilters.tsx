import Link from 'next/link'
import { Search, SlidersHorizontal } from 'lucide-react'
import { alertasHref, type AlertFilters as Filters } from '@/lib/alertas-ui'
import { SourcePicker } from './SourcePicker'

export function AlertFilters({ params, subcats, hasInterests }: { params: Filters; subcats: Array<{ slug: string; nombre: string }>; hasInterests: boolean }) {
  const sources = params.fuente?.split(',') ?? []
  const active = Boolean(params.q || params.fuente || params.urgencia || params.subcategoria)
  return <div className="rt-filter-panel">
    <div className="rt-filter-top">
      <nav aria-label="Vista de alertas" className="rt-tabs">
        <Link href={alertasHref(params, { solo_intereses: undefined, page: '1' })} aria-current={params.solo_intereses !== 'true' ? 'page' : undefined}>Todas</Link>
        {hasInterests ? <Link href={alertasHref(params, { solo_intereses: 'true', page: '1' })} aria-current={params.solo_intereses === 'true' ? 'page' : undefined}>Para ti</Link> : <Link href="/cuenta">Configurar intereses <span aria-hidden="true">↗</span></Link>}
      </nav>
      <form action="/alertas" className="rt-search" role="search">
        {Object.entries(params).filter(([k,v]) => v && !['q','page'].includes(k)).map(([k,v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="alert-search">Buscar en títulos y resúmenes</label>
        <input id="alert-search" name="q" defaultValue={params.q} placeholder="Buscar en las alertas…" maxLength={100} />
        <button type="submit">Buscar</button>
      </form>
    </div>
    <details className="rt-filters">
      <summary><SlidersHorizontal size={16} aria-hidden="true" /> Filtros <span>{active ? 'Hay filtros aplicados' : 'Boletín, tema y urgencia'}</span></summary>
      <form action="/alertas" className="rt-filter-form">
        {params.q && <input type="hidden" name="q" value={params.q} />}
        {params.solo_intereses && <input type="hidden" name="solo_intereses" value={params.solo_intereses} />}
        <div className="rt-selects">
          <label>Tema<select name="subcategoria" defaultValue={params.subcategoria ?? ''}><option value="">Todos los temas</option>{subcats.map(s => <option key={s.slug} value={s.slug}>{s.nombre}</option>)}</select></label>
          <label>Urgencia<select name="urgencia" defaultValue={params.urgencia ?? ''}><option value="">Cualquier urgencia</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>
        </div>
        <SourcePicker key={params.fuente ?? 'all'} selected={sources} />
        <div className="rt-filter-actions"><button type="submit" className="rt-button">Aplicar filtros</button><Link href="/alertas">Quitar todos los filtros</Link></div>
      </form>
    </details>
    {active && <div className="rt-applied" aria-label="Filtros aplicados">
      {params.q && <span>Búsqueda: {params.q}</span>}
      {sources.map(s => <span key={s}>{s}</span>)}
      {params.urgencia && <span>Urgencia {params.urgencia}</span>}
      {params.subcategoria && <span>{subcats.find(s => s.slug === params.subcategoria)?.nombre ?? params.subcategoria}</span>}
      <Link href="/alertas">Limpiar</Link>
    </div>}
  </div>
}
