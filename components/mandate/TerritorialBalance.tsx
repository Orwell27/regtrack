"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { normalizeMandateText } from "@/lib/mandate/model";
import { TERRITORIAL_STATUS_LABELS, type TerritorialBalance as Balance, type TerritorialRecord } from "@/lib/mandate/territorial-model";

const PAGE_SIZE = 15;
function RecordSource({ record, fallback, label }: { record: TerritorialRecord; fallback: string; label: string }) {
  const url = record.webSource?.url ?? `${fallback}#page=${record.page}`;
  return <a className="mc-link" href={url} target="_blank" rel="noreferrer">{record.webSource ? "Ficha municipal original" : `${label} · página ${record.page}${record.endPage !== record.page ? `–${record.endPage}` : ""}`}</a>;
}
function WebDetail({ record, language }: { record: TerritorialRecord; language?: string }) {
  if (!record.webSource) return null;
  return <details><summary>Texto completo de la ficha municipal</summary><div lang={language}>{record.detailText?.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    {record.detailLinks?.length ? <details><summary>Enlaces de la ficha original</summary><ul>{record.detailLinks.map((url, index) => <li key={url}><a className="mc-link" href={url} target="_blank" rel="noreferrer">Enlace relacionado {index + 1}</a></li>)}</ul></details> : null}
    <p>Captura de esta ficha: {record.webSource.retrievedAt.slice(0, 10)}. La fecha de consulta no acredita cuándo se ejecutó.</p><p className="mt-hash">SHA-256 del HTML original: {record.webSource.sha256}</p></details>;
}
function Initiatives({ record, sourceUrl, strategic }: { record: TerritorialRecord; sourceUrl: string; strategic: boolean }) {
  if (!record.initiatives) return null;
  return <details><summary>{strategic ? "Objetivos específicos" : "Iniciativas del compromiso"} · {record.initiatives.length}</summary><ol>{record.initiatives.map(initiative => <li key={initiative.id ?? initiative.officialId} value={strategic ? undefined : Number(initiative.officialId)}>{strategic ? <p><strong>{initiative.officialId}</strong></p> : null}<p>{initiative.text}</p>{initiative.sourceNote ? <p className="mc-warning">{initiative.sourceNote}</p> : null}<a className="mc-link" href={`${sourceUrl}#page=${initiative.page}`} target="_blank" rel="noreferrer">Página {initiative.page}{initiative.endPage !== initiative.page ? `–${initiative.endPage}` : ""}</a></li>)}</ol></details>;
}
function ProgrammeSheet({ record, language, copy }: { record: TerritorialRecord; language?: string; copy?: boolean }) {
  if (!record.programmeText) return null;
  return <details><summary>{copy ? "Ficha completa de la copia del programa" : "Ficha completa del programa original"}</summary><p lang={language} style={{ whiteSpace: "pre-line" }}>{record.programmeText}</p></details>;
}
function GovernmentFollowup({ record }: { record: TerritorialRecord }) {
  const report = record.governmentReport;
  if (!report) return null;
  return <details><summary>Seguimiento publicado por el Ayuntamiento · {report.percentage.toLocaleString("es-ES")}% declarado</summary>
    <p>Ficha municipal {report.officialId}: {report.title}. Este porcentaje corresponde a la metodología del Ayuntamiento; no es una valoración de RegTrack ni una medida independiente de impacto. Los periodos particulares se conservan en el texto.</p>
    <p style={{ whiteSpace: "pre-line" }}>{report.text}</p>
    <a className="mc-link" href={report.url} target="_blank" rel="noreferrer">Consultar el seguimiento municipal original</a>
    {report.links.length ? <details><summary>Enlaces aportados por el Ayuntamiento</summary><ul>{report.links.map((url, index) => <li key={url}><a className="mc-link" href={url} target="_blank" rel="noreferrer">Referencia municipal {index + 1}</a></li>)}</ul><p>Su presencia en el seguimiento no significa que RegTrack haya revisado cada enlace. Las pruebas incorporadas se identifican en las revisiones y en Fuentes y trazabilidad.</p></details> : null}
  </details>;
}
export function TerritorialBalance({ balance }: { balance: Balance }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const reviews = new Map(balance.reviews.map(review => [review.commitmentId, review]));
  const sources = new Map(balance.sources.map(source => [source.id, source]));
  const searchable = useMemo(() => balance.records.map(record => ({ record, text: normalizeMandateText(`${record.officialId} ${record.text} ${record.topic} ${record.detailText ?? ""} ${record.programmeText ?? ""} ${record.governmentReport?.officialId ?? ""} ${record.governmentReport?.text ?? ""} ${record.initiatives?.map(initiative => `${initiative.officialId} ${initiative.text}`).join(" ") ?? ""}`) })), [balance.records]);
  const terms = normalizeMandateText(query).split(/\s+/).filter(Boolean);
  const records = searchable.filter(({ record, text }) => (filter === "all" || (filter === "reviewed" ? reviews.has(record.id) : !reviews.has(record.id)))
    && terms.every(term => text.includes(term))).map(({ record }) => record);
  const pages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const inventorySource = sources.get(balance.sourceId)!;
  const programme = sources.get(balance.mandateSourceId)!;
  const territorialLabel = balance.level === "municipality" ? "municipal" : "autonómico";
  const catalogue = balance.inventoryKind === "action-catalogue";
  const strategic = balance.inventoryKind === "strategic-plan";
  const recordUnit = strategic ? "objetivos estratégicos" : catalogue ? "actuaciones" : "compromisos";
  const governmentLabel = balance.governmentDateKind === "capture" ? "Estado declarado por el Ayuntamiento en el catálogo consultado el" : "Estado declarado por el Gobierno a";
  return <div className="mn-app">
    <a className="mn-skip" href="#territorial-content">Saltar al contenido</a>
    <header className="mn-header"><Link className="mn-brand" href="/observatorio">RegTrack<small>OBSERVATORIO PÚBLICO</small></Link><nav aria-label="Navegación territorial"><Link href="/observatorio/mandato/cobertura">Toda la cobertura</Link><a href="#territorial-reviews">Revisiones disponibles</a><a href="#territorial-inventory">Inventario {territorialLabel}</a></nav></header>
    <main className="mn-main" id="territorial-content">
      <section className="mc-intro"><p className="mn-eyebrow">Balance {territorialLabel} · revisión documental parcial</p><h1>{balance.mandateLabel}</h1><p>{balance.scope}</p><p className="mc-warning">{strategic ? "Plan estratégico importado; inventario y correspondencia de las promesas políticas pendientes." : catalogue ? "Catálogo consultado completo; reconstrucción de las promesas originales pendiente." : "Inventario completo del documento, balance todavía parcial."} Ninguna de estas fichas ha pasado una revisión humana independiente. Las fuentes de una misma administración comparten origen. La publicación de un acto en otro boletín no verifica por sí sola sus resultados.</p></section>
      <div className="mn-summary-grid"><div><strong>{balance.records.length}</strong><span>{recordUnit} del documento {catalogue ? "importadas" : "importados"}</span></div><div><strong>{balance.reviews.length}</strong><span>fichas con revisión documental parcial</span></div><div><strong>{balance.inventoryTotal - balance.reviews.length}</strong><span>medidas pendientes de revisión</span></div></div>
      <section className="mn-method"><h2>Qué se ha comprobado</h2><div><p>Las fichas separan la actuación documentada, lo que comunica la administración y las partes sin evidencia suficiente. Una aprobación o un plan no acreditan su ejecución ni su impacto. El dato más reciente puede ser anterior a la fecha de revisión.</p><p>{balance.textNote} <a className="mc-link" href={programme.url} target="_blank" rel="noreferrer">{strategic ? "Consultar el acuerdo político CC–PP" : catalogue ? "Consultar el portal municipal del plan" : balance.programmeCopy ? "Consultar la copia del programa" : "Consultar el programa original"}</a>.</p></div></section>
      <section id="territorial-reviews"><h2>Revisiones disponibles · {balance.reviews.length}</h2><p>Cada revisión conserva sus límites y el trabajo pendiente. No se calcula un porcentaje de cumplimiento a partir de esta selección.</p>
        {balance.reviews.map(review => {
          const record = balance.records.find(item => item.id === review.commitmentId)!;
          return <article className="mc-card mt-review" key={record.id} id={`compromiso-${record.id}`}>
            <p className="mn-eyebrow">{strategic ? "Objetivo" : "Medida"} {record.officialId} · revisión {review.reviewedAt}</p><h3>{review.title}</h3>
            <details><summary>{strategic ? "Objetivo y página de origen" : catalogue ? "Actuación publicada y fuente" : "Promesa y página de origen"}</summary><p lang={balance.textLanguage}>{record.text}</p>{record.governmentState ? <p>{governmentLabel} {balance.governmentCutoff}: <strong>{record.governmentState}</strong>. No es una valoración de RegTrack.</p> : null}
          <RecordSource record={record} fallback={inventorySource.url} label={balance.sourceLabel} /><ProgrammeSheet record={record} language={balance.textLanguage} copy={balance.programmeCopy} /><GovernmentFollowup record={record} /><WebDetail record={record} language={balance.textLanguage} /><Initiatives record={record} sourceUrl={inventorySource.url} strategic={strategic} /></details>
            <p><strong>{review.conclusion}</strong></p><p>{review.periodNote}</p>
            <div className="mt-components">{review.components.map(component => <section key={component.id} aria-labelledby={`${record.id}-${component.id}`}>
              <h4 id={`${record.id}-${component.id}`}>{component.claim}</h4><p className="mn-eyebrow">{TERRITORIAL_STATUS_LABELS[component.status]}</p><p>{component.finding}</p>
              {component.citations.length ? <ul>{component.citations.map(citation => {
                const source = sources.get(citation.sourceId)!;
                return <li key={`${citation.sourceId}-${citation.locator}`}><a className="mc-link" href={`${source.url}${citation.page ? `#page=${citation.page}` : ""}`} target="_blank" rel="noreferrer">{source.title}</a><p>{citation.locator} · {source.publisher} · consulta {source.retrievedAt.slice(0, 10)}{source.captureType === "extracto_editorial" ? " · extracto editorial conservado; no es el archivo original" : ""}</p></li>;
              })}</ul> : <p>Sin prueba incorporada para resolver este componente.</p>}
            </section>)}</div>
            <h4>Contraste y límites</h4><p>{review.contrast}</p><details><summary>Qué falta para cerrar esta ficha</summary><ul>{review.pending.map(item => <li key={item}>{item}</li>)}</ul></details>
          </article>;
        })}
      </section>
      <section id="territorial-inventory"><h2>{catalogue ? "Las" : "Los"} {balance.inventoryTotal} {recordUnit} del inventario</h2>
        <div className="mc-filters"><label>Buscar medida {balance.level === "municipality" ? "municipal" : "autonómica"}<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Tema, palabra o número…" /></label><label>Revisión<select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="all">Todas las medidas</option><option value="reviewed">Con revisión documental parcial</option><option value="pending">Pendientes de revisión</option></select></label></div>
        <p className="mc-results" role="status">{records.length} resultados · página {current} de {pages}</p>
        <div className="mc-list">{records.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map(record => <article className="mc-card" key={record.id}>
          <p className="mn-eyebrow">{strategic ? "Objetivo" : "Medida"} {record.officialId} · {record.topic}</p><h3 lang={balance.textLanguage}>{record.text}</h3><p>{reviews.has(record.id) ? "Con revisión documental parcial" : "Pendiente de revisión · Sin conclusión de RegTrack"}</p>
          <Initiatives record={record} sourceUrl={inventorySource.url} strategic={strategic} />
          <WebDetail record={record} language={balance.textLanguage} />
          <ProgrammeSheet record={record} language={balance.textLanguage} copy={balance.programmeCopy} />
          <GovernmentFollowup record={record} />
          {record.governmentState ? <p>{governmentLabel} {balance.governmentCutoff}: <strong>{record.governmentState}</strong>{record.governmentProgress ? ` · porcentaje municipal ${record.governmentProgress}` : ""}. No es una valoración de RegTrack.</p> : null}
          <RecordSource record={record} fallback={inventorySource.url} label={balance.sourceLabel} />
          {reviews.has(record.id) ? <p><a className="mc-link" href={`#compromiso-${record.id}`}>Leer evidencia y límites</a></p> : null}
        </article>)}</div>
        {!records.length ? <p>No hay medidas con estos filtros.</p> : null}
        <nav className="mc-pagination" aria-label={`Páginas del inventario ${territorialLabel}`}><button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</button><span>{current} / {pages}</span><button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Siguiente</button></nav>
      </section>
      <section className="mn-method"><h2>Fuentes y trazabilidad</h2><div><p>Las huellas SHA-256 identifican el material conservado: se distingue la captura original del extracto editorial. Las fuentes se agrupan por origen, no por número de enlaces.</p><ul className="mn-source-list">{balance.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{source.publisher} · origen {source.family} · {source.publicationDate ? `publicación ${source.publicationDate} · ` : "fecha de publicación no identificada · "}consulta {source.retrievedAt.slice(0, 10)}</p><p>{source.captureType === "bytes_originales" ? "Captura original conservada." : "Extracto editorial conservado; la huella no corresponde al documento original."}</p><p className="mt-hash">SHA-256: {source.sha256}</p></li>)}</ul></div></section>
      <footer className="mn-footer"><Link href="/observatorio/mandato/cobertura">Volver a las 70 administraciones</Link><p>Cada balance evalúa compromisos de su propia administración y conserva sus límites.</p></footer>
    </main>
  </div>;
}
