"use client";
import { useState } from "react";
import Link from "next/link";
import { ASSESSMENT_LABELS, normalizeMandateText } from "@/lib/mandate/model";
import { JURISDICTION_LABELS, isCoverageComplete, type Jurisdiction } from "@/lib/mandate/coverage-model";
import type { PublicInventory } from "@/lib/mandate/coverage";

const PAGE_SIZE = 15;
export function MandateCoverage({ jurisdictions, inventory }: { jurisdictions: Jurisdiction[]; inventory: PublicInventory }) {
  const [tab, setTab] = useState<"territories" | "inventory">("territories");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [review, setReview] = useState("");
  const [page, setPage] = useState(1);
  const terms = normalizeMandateText(query).split(/\s+/).filter(Boolean);
  const matches = (text: string) => terms.every(term => normalizeMandateText(text).includes(term));
  const territories = jurisdictions.filter(item => (!level || item.level === level) && matches(item.name));
  const records = inventory.records.filter(item => (!review || (review === "reviewed" ? item.reviewed : !item.reviewed)) && matches(`${item.officialId} ${item.text} ${item.origin} ${item.topics}`));
  const count = tab === "territories" ? territories.length : records.length;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const reviewed = inventory.records.filter(item => item.reviewed).length;
  function switchTab(value: typeof tab) { setTab(value); setQuery(""); setPage(1); }
  return <div className="mn-app">
    <a href="#coverage-content" className="mn-skip">Saltar al contenido</a>
    <header className="mn-header"><Link className="mn-brand" href="/observatorio">RegTrack<small>OBSERVATORIO PÚBLICO</small></Link><nav aria-label="Navegación de cobertura"><Link href="/observatorio/mandato">Balance nacional</Link><a href="#coverage-explore">Explorar cobertura</a></nav></header>
    <main className="mn-main" id="coverage-content">
      <section className="mc-intro"><p className="mn-eyebrow">Balance de mandato · cobertura</p><h1>Qué hemos revisado.<br /><em>Qué falta por comprobar.</em></h1>
        <p>España, las 17 comunidades autónomas, Ceuta y Melilla y las 50 capitales de provincia. Cada administración necesita su propio inventario, sus plazos y su evidencia.</p>
        <p className="mc-warning">Ampliación en curso. Los perfiles territoriales todavía no tienen balances revisados. Estar incluido aquí no significa tener una evaluación completada.</p>
      </section>
      <div className="mn-summary-grid"><div><strong>{jurisdictions.length}</strong><span>administraciones en el alcance acordado</span></div><div><strong>{reviewed} / {inventory.records.length}</strong><span>compromisos nacionales con revisión sustantiva</span></div><div><strong>{jurisdictions.filter(isCoverageComplete).length}</strong><span>balances con cobertura y revisión independiente completas</span></div></div>
      <section className="mn-method"><h2>Cómo leer la cobertura</h2><div><p>Un enlace localizado no es una corroboración. Las notas y balances de un mismo gobierno comparten origen; no se cuentan como confirmaciones independientes. Una norma acredita una medida, pero la ejecución y sus resultados necesitan pruebas adicionales.</p><p>«Sin inventario» significa que desconocemos todavía el total aplicable. No significa cero compromisos ni incumplimiento. Los porcentajes entre administraciones no son comparables mientras sus universos y criterios difieran.</p></div></section>
      <section id="coverage-explore" aria-labelledby="coverage-heading"><h2 id="coverage-heading">Explorar el alcance</h2>
        <div className="mn-tabs" role="group" aria-label="Contenido de cobertura"><button type="button" aria-pressed={tab === "territories"} onClick={() => switchTab("territories")}>Administraciones · {jurisdictions.length}</button><button type="button" aria-pressed={tab === "inventory"} onClick={() => switchTab("inventory")}>Inventario nacional · {inventory.records.length}</button></div>
        <div className="mc-filters"><label>Buscar {tab === "territories" ? "administración" : "compromiso"}<input type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder={tab === "territories" ? "Madrid, Navarra, Almería…" : "Vivienda, salud, número de ficha…"} /></label>
          {tab === "territories" ? <label>Ámbito<select value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}><option value="">Todos los ámbitos</option>{Object.entries(JURISDICTION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label> : <label>Revisión<select value={review} onChange={e => { setReview(e.target.value); setPage(1); }}><option value="">Todos los compromisos</option><option value="reviewed">Con revisión sustantiva</option><option value="pending">Pendientes de revisión</option></select></label>}
        </div>
        <p className="mc-results" role="status">{count} resultados · página {currentPage} de {pages}</p>
        {tab === "inventory" ? <p className="mc-warning">{inventory.limitation} Corte del inventario: {inventory.governmentCutoff}. <a href={inventory.sourceUrl} target="_blank" rel="noreferrer">Consultar original</a>.</p> : null}
        <div className="mc-list">{tab === "territories" ? territories.slice(start, start + PAGE_SIZE).map(item => <article className="mc-card" key={item.id}>
          <p className="mn-eyebrow">{JURISDICTION_LABELS[item.level]} · {item.id}</p><h3>{item.name}</h3>
          <p><strong>{item.id === "es" ? "Balance parcial disponible" : "Balance pendiente de elaboración"}</strong></p><p>{item.mandate?.label ?? "Mandato vigente pendiente de comprobación documental."}</p>
          <dl className="mc-counts"><div><dt>Inventario importado</dt><dd>{item.inventoryTotal === null ? "Universo aún no determinado" : `${item.imported} de ${item.inventoryTotal}`}</dd></div><div><dt>Revisión sustantiva</dt><dd>{item.reviewed} compromisos</dd></div><div><dt>Revisión independiente</dt><dd>{item.independentlyReviewed} compromisos</dd></div></dl>
          {item.id === "es" ? <Link className="mc-link" href="/observatorio/mandato#balance-documental">Leer las revisiones nacionales</Link> : null}
          <details><summary>Fuentes localizadas y trabajo pendiente</summary><ul>{item.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>
            {item.sources.length ? <ul className="mn-source-list">{item.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{source.publisher} · consulta {source.consultedAt}</p><p>{source.scopeNote}</p></li>)}</ul> : <p>Todavía no se ha incorporado una fuente específica a este perfil.</p>}
          </details>
        </article>) : records.slice(start, start + PAGE_SIZE).map(item => <article className="mc-card" key={item.id}>
          <p className="mn-eyebrow">España · compromiso {item.officialId}</p><h3>{item.text}</h3><p>Origen atribuido por el inventario: {item.origin}</p>
          <p><strong>{item.reviewed ? "Con revisión sustantiva" : "Pendiente de revisión sustantiva"}</strong>{item.verdict ? ` · ${ASSESSMENT_LABELS[item.verdict]}` : " · Sin conclusión de RegTrack"}</p>
          {item.reviewed ? <Link className="mc-link" href={`/observatorio/mandato#compromiso-${item.id}`}>Leer evidencia, límites y correcciones</Link> : <p>Faltan comprobar el origen, el plazo, la competencia, las actuaciones y sus resultados. Los enlaces aportados por el Gobierno aún no se han auditado para esta ficha.</p>}
        </article>)}</div>
        {!count ? <p className="mc-warning">No hay resultados con estos filtros.</p> : null}
        <nav className="mc-pagination" aria-label="Páginas de resultados"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>{currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button></nav>
      </section>
      <footer className="mn-footer"><p>El alcance municipal inicial comprende capitales de provincia. Ceuta y Melilla figuran una sola vez, como ciudades autónomas.</p><Link href="/observatorio/mandato#honestidad">Criterios y honestidad de la revisión</Link></footer>
    </main>
  </div>;
}
