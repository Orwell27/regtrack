"use client";
import { useState } from "react";
import Link from "next/link";
import { normalizeMandateText } from "@/lib/mandate/model";
import { TERRITORIAL_STATUS_LABELS, type TerritorialBalance as Balance } from "@/lib/mandate/territorial-model";

const PAGE_SIZE = 15;
export function TerritorialBalance({ balance }: { balance: Balance }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const reviews = new Map(balance.reviews.map(review => [review.commitmentId, review]));
  const sources = new Map(balance.sources.map(source => [source.id, source]));
  const terms = normalizeMandateText(query).split(/\s+/).filter(Boolean);
  const records = balance.records.filter(record => (filter === "all" || (filter === "reviewed" ? reviews.has(record.id) : !reviews.has(record.id)))
    && terms.every(term => normalizeMandateText(`${record.officialId} ${record.text} ${record.topic}`).includes(term)));
  const pages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const programme = sources.get(balance.sourceId)!;
  return <div className="mn-app">
    <a className="mn-skip" href="#territorial-content">Saltar al contenido</a>
    <header className="mn-header"><Link className="mn-brand" href="/observatorio">RegTrack<small>OBSERVATORIO PÚBLICO</small></Link><nav aria-label="Navegación territorial"><Link href="/observatorio/mandato/cobertura">Toda la cobertura</Link><a href="#territorial-reviews">Revisiones disponibles</a><a href="#territorial-inventory">Inventario municipal</a></nav></header>
    <main className="mn-main" id="territorial-content">
      <section className="mc-intro"><p className="mn-eyebrow">Balance municipal · revisión documental parcial</p><h1>{balance.mandateLabel}</h1><p>{balance.scope}</p><p className="mc-warning">Inventario completo del documento, balance todavía parcial. Ninguna de estas fichas ha pasado una revisión humana independiente. Las fuentes municipales comparten origen y no se cuentan como corroboraciones independientes.</p></section>
      <div className="mn-summary-grid"><div><strong>{balance.records.length}</strong><span>medidas del programa importadas</span></div><div><strong>{balance.reviews.length}</strong><span>fichas con revisión documental parcial</span></div><div><strong>{balance.inventoryTotal - balance.reviews.length}</strong><span>medidas pendientes de revisión</span></div></div>
      <section className="mn-method"><h2>Qué se ha comprobado</h2><div><p>Las fichas separan la actuación documentada, lo que comunica la administración y las partes sin evidencia suficiente. Una aprobación o un plan no acreditan su ejecución ni su impacto. El dato más reciente puede ser anterior a la fecha de revisión.</p><p>{balance.textNote} <a className="mc-link" href={programme.url} target="_blank" rel="noreferrer">Consultar el programa original</a>.</p></div></section>
      <section id="territorial-reviews"><h2>Revisiones disponibles · {balance.reviews.length}</h2><p>Cada revisión conserva sus límites y el trabajo pendiente. No se calcula un porcentaje de cumplimiento a partir de esta selección.</p>
        {balance.reviews.map(review => {
          const record = balance.records.find(item => item.id === review.commitmentId)!;
          return <article className="mc-card mt-review" key={record.id} id={`compromiso-${record.id}`}>
            <p className="mn-eyebrow">Medida {record.officialId} · revisión {review.reviewedAt}</p><h3>{review.title}</h3>
            <details><summary>Promesa y página de origen</summary><p>{record.text}</p><a className="mc-link" href={`${programme.url}#page=${record.page}`} target="_blank" rel="noreferrer">Programa · página {record.page}{record.endPage !== record.page ? `–${record.endPage}` : ""}</a></details>
            <p><strong>{review.conclusion}</strong></p><p>{review.periodNote}</p>
            <div className="mt-components">{review.components.map(component => <section key={component.id} aria-labelledby={`${record.id}-${component.id}`}>
              <h4 id={`${record.id}-${component.id}`}>{component.claim}</h4><p className="mn-eyebrow">{TERRITORIAL_STATUS_LABELS[component.status]}</p><p>{component.finding}</p>
              {component.citations.length ? <ul>{component.citations.map(citation => {
                const source = sources.get(citation.sourceId)!;
                return <li key={`${citation.sourceId}-${citation.locator}`}><a className="mc-link" href={`${source.url}${citation.page ? `#page=${citation.page}` : ""}`} target="_blank" rel="noreferrer">{source.title}</a><p>{citation.locator} · {source.publisher} · consulta {source.retrievedAt.slice(0, 10)}</p></li>;
              })}</ul> : <p>Sin prueba incorporada para resolver este componente.</p>}
            </section>)}</div>
            <h4>Contraste y límites</h4><p>{review.contrast}</p><details><summary>Qué falta para cerrar esta ficha</summary><ul>{review.pending.map(item => <li key={item}>{item}</li>)}</ul></details>
          </article>;
        })}
      </section>
      <section id="territorial-inventory"><h2>Las {balance.inventoryTotal} medidas del programa</h2>
        <div className="mc-filters"><label>Buscar medida municipal<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="BiciMAD, IBI, turismo, número…" /></label><label>Revisión<select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="all">Todas las medidas</option><option value="reviewed">Con revisión documental parcial</option><option value="pending">Pendientes de revisión</option></select></label></div>
        <p className="mc-results" role="status">{records.length} resultados · página {current} de {pages}</p>
        <div className="mc-list">{records.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map(record => <article className="mc-card" key={record.id}>
          <p className="mn-eyebrow">Medida {record.officialId} · {record.topic}</p><h3>{record.text}</h3><p>{reviews.has(record.id) ? "Con revisión documental parcial" : "Pendiente de revisión · Sin conclusión de RegTrack"}</p>
          <a className="mc-link" href={`${programme.url}#page=${record.page}`} target="_blank" rel="noreferrer">Programa · página {record.page}{record.endPage !== record.page ? `–${record.endPage}` : ""}</a>
          {reviews.has(record.id) ? <p><a className="mc-link" href={`#compromiso-${record.id}`}>Leer evidencia y límites</a></p> : null}
        </article>)}</div>
        {!records.length ? <p>No hay medidas con estos filtros.</p> : null}
        <nav className="mc-pagination" aria-label="Páginas del inventario municipal"><button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</button><span>{current} / {pages}</span><button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente</button></nav>
      </section>
      <section className="mn-method"><h2>Fuentes y trazabilidad</h2><div><p>Las huellas SHA-256 identifican el material conservado: se distingue la captura original del extracto editorial. Las fuentes se agrupan por origen, no por número de enlaces.</p><ul className="mn-source-list">{balance.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{source.publisher} · origen {source.family} · {source.publicationDate ? `publicación ${source.publicationDate} · ` : "fecha de publicación no identificada · "}consulta {source.retrievedAt.slice(0, 10)}</p><p>{source.captureType === "bytes_originales" ? "Captura original conservada." : "Extracto editorial conservado; la huella no corresponde al artículo original."}</p><p className="mt-hash">SHA-256: {source.sha256}</p></li>)}</ul></div></section>
      <footer className="mn-footer"><Link href="/observatorio/mandato/cobertura">Volver a las 70 administraciones</Link><p>Una revisión municipal no sustituye la evaluación autonómica o nacional.</p></footer>
    </main>
  </div>;
}
