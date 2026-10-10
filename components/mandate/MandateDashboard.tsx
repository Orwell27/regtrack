"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, Search, Sparkles } from "lucide-react";
import {
  MANDATE_TOPICS,
  ASSESSMENT_LABELS,
  COMPONENT_STATE_LABELS,
  EVIDENCE_STAGE_LABELS,
  normalizeMandateText,
  type Commitment,
  type Evidence,
  type Indicator,
  type MandateSnapshot,
} from "@/lib/mandate/model";
import { MandateCountdown } from "./MandateCountdown";
import { MandateQuestion } from "./MandateQuestion";
import { IndicatorTrend } from "./IndicatorTrend";
import { MandateAccountability } from "./MandateAccountability";

function dateLabel(value: string | null) {
  if (!value) return "Fecha no indicada";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" }).format(new Date(value));
}
const formatNumber = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 10 });
function numberLabel(value: number | null) { return value === null ? "No disponible" : formatNumber.format(value); }
function topicLabel(id: string) { return MANDATE_TOPICS[id] ?? id; }
function frequencyLabel(frequency: string) { return ({ annual: "Anual", quarterly: "Trimestral", monthly: "Mensual" } as Record<string, string>)[frequency] ?? frequency; }
function observationStatus(status?: string) { return status === "p" ? "Provisional (p)" : status === "avance" ? "Avance" : status === "definitivo" ? "Definitivo" : status || "Sin marca adicional"; }

function Sources({ sources }: { sources: Evidence[] }) {
  return <ul className="mn-source-list">{sources.map((source) => <li key={source.id}>
    <a href={source.url} target="_blank" rel="noreferrer">{source.title} <ArrowUpRight size={11} aria-hidden="true" /></a>
    <p>{source.producer} · {dateLabel(source.publishedAt)}</p>
    <p>{source.locator}</p>
    {source.excerpt ? <p className="mn-source-excerpt"><strong>Descripción en esta ficha:</strong> {source.excerpt}</p> : null}
    <small>Consultada el {dateLabel(source.retrievedAt)}</small>
    {source.sha256 ? <p><small>Huella SHA-256: <code>{source.sha256}</code></small></p> : null}
    {source.captureNote ? <p className="mn-evidence-note">{source.captureNote}</p> : null}
  </li>)}</ul>;
}

function CommitmentCard({ item, indicators, openIndicator }: { item: Commitment; indicators: Indicator[]; openIndicator: (id: string) => void }) {
  return <article className="mn-card mn-commitment" id={`compromiso-${item.id}`} aria-labelledby={`title-${item.id}`}>
    <div className="mn-card-top"><div className="mn-topics">{item.topics.map((topic) => <span key={topic}>{topicLabel(topic)}</span>)}</div><span className="mn-card-id">{item.officialId}</span></div>
    <h3 id={`title-${item.id}`}>{item.title}</h3>
    <p className="mn-assessment-verdict" data-verdict={item.assessment.verdict}>{ASSESSMENT_LABELS[item.assessment.verdict]}</p>
    <p className="mn-card-summary"><strong>Qué se prometió.</strong> {item.assessment.expected}</p>
    <dl className="mn-dual-status">
      <div><dt>Información del Gobierno</dt><dd>{item.governmentAssessment.label}</dd></div>
      <div><dt>Contraste RegTrack · piloto</dt><dd><span className="mn-status" data-status={item.review.status}>{item.review.label}</span></dd></div>
    </dl>
    <p className="mn-card-summary">{item.review.conclusion}</p>
    <div className="mn-practical-effect"><h4>Qué cambia en la práctica</h4><p>{item.assessment.practicalEffect}</p></div>
    <p className="mn-assessment-period"><strong>Periodo comprobado:</strong> {item.assessment.temporalScope}</p>
    <div className="mn-card-links"><a href={`#compromiso-${item.id}`}>Enlace a esta ficha <ArrowUpRight size={11} aria-hidden="true" /></a><span>Revisión: {dateLabel(item.review.date)}</span></div>
    <details className="mn-evidence">
      <summary>Leer compromiso y evidencia · {item.evidence.length} fuentes</summary>
      <div className="mn-evidence-body">
        <h4>Texto del inventario</h4><p>{item.text}</p>
        <dl className="mn-card-meta"><div><dt>Origen atribuido</dt><dd>{item.origin}<p className="mn-origin-date">Documento de origen atribuido: {dateLabel(item.originDate)}</p><p className="mn-origin-note">{item.originNote}</p></dd></div><div><dt>Plazo recogido</dt><dd>{item.deadline}</dd></div><div><dt>Competencia</dt><dd>{item.competence}</dd></div><div><dt>Información del Gobierno fechada</dt><dd>{dateLabel(item.governmentAssessment.date)}</dd></div></dl>
        <h4>Criterio de revisión</h4><p>{item.review.criterion}</p>
        <h4>Alcance de esta conclusión</h4><p>{item.assessment.scope}</p>
        <h4>Qué falta para concluir más</h4><p className="mn-assessment-missing">{item.assessment.missingEvidence}</p>
        <section className="mn-quality-parts" aria-label={`Comprobación por objetivos: ${item.title}`}>
          <h4>Comprobación por objetivos</h4>
          <p>Solidez del hecho indicado, no del compromiso entero. Un dato puede estar bien documentado y dejar sin demostrar el objetivo final.</p>
          <ol>{item.quality.components.map(part => <li key={part.id}>
            <h5>{part.label}</h5><p className="mn-part-state" data-state={part.state}>{EVIDENCE_STAGE_LABELS[part.stage]} · {COMPONENT_STATE_LABELS[part.state]}</p>
            <p><strong>Criterio editorial:</strong> {part.criterion}</p><p>{part.finding}</p>
            {part.evidenceIds.length ? <ul className="mn-part-sources">{part.evidenceIds.map(id => { const source = item.evidence.find(source => source.id === id)!; return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span> · {source.locator}</span></li>; })}</ul> : <p>Sin evidencia suficiente incorporada para resolver este componente.</p>}
          </li>)}</ol>
          <h4>Contraste adicional y límites</h4><p>{item.quality.challenge}</p>
          <p><strong>Revisar cuando:</strong> {item.quality.refreshTrigger}</p>
          {item.quality.overlaps.length ? <p>Comparte medidas o ámbito con {item.quality.overlaps.map((id,index) => <span key={id}>{index ? ", " : ""}<a href={`#compromiso-${id}`}>{id.replace("c-", "ficha ")}</a></span>)}. No sumar estas fichas como logros independientes.</p> : null}
          {item.quality.correction ? <div className="mn-correction"><h4>{item.quality.correction.kind === "error" ? "Corrección" : "Aclaración o evidencia añadida"} · {dateLabel(item.quality.reviewedAt)}</h4><p>{item.quality.correction.reason}</p><dl>{item.quality.correction.changes.map(change => <div key={change.field}><dt>Antes</dt><dd>{change.before}</dd><dt>Ahora</dt><dd>{change.after}</dd></div>)}</dl></div> : null}
        </section>
        <h4>Fuentes para contrastar</h4><Sources sources={item.evidence} />
        {item.indicatorIds.length ? <div className="mn-correlation"><strong>Indicadores de contexto</strong><p>La relación es temática y documental. No demuestra que el compromiso haya causado el cambio del indicador.</p>{item.indicatorIds.map((id) => {
          const indicator = indicators.find((candidate) => candidate.id === id);
          return indicator ? <a key={id} href={`#indicador-${id}`} onClick={() => openIndicator(id)}>{indicator.label} <ArrowUpRight size={11} aria-hidden="true" /></a> : null;
        })}</div> : null}
      </div>
    </details>
  </article>;
}

function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const hasSurveyPeriod = indicator.observations.some((observation) => observation.sourcePeriod);
  return <article className="mn-card mn-indicator" id={`indicador-${indicator.id}`} aria-labelledby={`indicator-title-${indicator.id}`}>
    <div className="mn-card-top"><span>{topicLabel(indicator.topic)}</span><span>{indicator.geography}</span></div>
    <h3 id={`indicator-title-${indicator.id}`}>{indicator.label}</h3>
    <div className="mn-indicator-value"><strong>{numberLabel(indicator.latest.value)}</strong><span>{indicator.unit} · {indicator.latest.period}</span>{indicator.latest.status ? <small className="mn-observation-status">Estado de la fuente: {observationStatus(indicator.latest.status)}</small> : null}</div>
    {indicator.latest.sourcePeriod ? <p className="mn-source-period">Periodo de encuesta: {indicator.latest.sourcePeriod}. El periodo del valor corresponde a los ingresos.</p> : null}
    <IndicatorTrend indicator={indicator} />
    <p className="mn-card-summary">{indicator.explanation}</p>
    <dl className="mn-card-meta"><div><dt>Referencia inicial</dt><dd>{numberLabel(indicator.baseline.value)} · {indicator.baseline.period}{indicator.baseline.status ? <small className="mn-observation-status">{observationStatus(indicator.baseline.status)}</small> : null}</dd></div><div><dt>Frecuencia</dt><dd>{frequencyLabel(indicator.frequency)}</dd></div></dl>
    <p className="mn-indicator-context">La evolución describe esta serie. Su atribución a una política requiere una evaluación específica.</p>
    <div className="mn-card-links"><a href={indicator.source.url} target="_blank" rel="noreferrer">Fuente original <ArrowUpRight size={11} aria-hidden="true" /></a><span>{indicator.source.producer}</span></div>
    <details className="mn-evidence"><summary>Ver serie, metodología y límites</summary><div className="mn-evidence-body">
      <div className="mn-table-scroll" tabIndex={0} role="region" aria-label={`Serie de ${indicator.label}`}><table>
        <caption>{indicator.unit}. Un valor ausente se muestra como «No disponible», no como cero.</caption>
        <thead><tr><th scope="col">{hasSurveyPeriod ? "Año de ingresos" : "Periodo de la fuente"}</th><th scope="col">Valor</th><th scope="col">Estado de la fuente</th>{hasSurveyPeriod ? <th scope="col">Periodo de encuesta</th> : null}</tr></thead>
        <tbody>{indicator.observations.map((observation) => <tr key={observation.period}><th scope="row">{observation.period}</th><td>{numberLabel(observation.value)}</td><td>{observationStatus(observation.status)}</td>{hasSurveyPeriod ? <td>{observation.sourcePeriod ?? "No indicado"}</td> : null}</tr>)}</tbody>
      </table></div>
      <h4>Cómo leer este indicador</h4>{indicator.caveats.map((caveat) => <p key={caveat}>{caveat}</p>)}
      <h4>Procedencia</h4><Sources sources={[indicator.source]} />
    </div></details>
  </article>;
}

export function MandateDashboard({ snapshot, nowISO }: { snapshot: MandateSnapshot; nowISO: string }) {
  const [view, setView] = useState<"commitments" | "indicators">("commitments");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("");
  const [verdict, setVerdict] = useState("");
  useEffect(() => {
    let frame = 0;
    const showLinkedRecord = () => {
      let anchor = "";
      try { anchor = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const indicator = snapshot.indicators.find((item) => anchor === `indicador-${item.id}`);
      const commitment = snapshot.commitments.find((item) => anchor === `compromiso-${item.id}`);
      if (!indicator && !commitment) return;
      setView(indicator ? "indicators" : "commitments");
      setQuery(""); setTopic(""); setStatus(""); setVerdict("");
      frame = window.requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: "start" }));
    };
    const first = window.setTimeout(showLinkedRecord, 0);
    window.addEventListener("hashchange", showLinkedRecord);
    return () => { window.clearTimeout(first); window.cancelAnimationFrame(frame); window.removeEventListener("hashchange", showLinkedRecord); };
  }, [snapshot.commitments, snapshot.indicators]);
  const terms = normalizeMandateText(query).trim().split(/\s+/).filter(Boolean);
  const topics = [...new Set([...snapshot.commitments.flatMap((item) => item.topics), ...snapshot.indicators.map((item) => item.topic)])];
  const statuses = [["documented", "Actuación documentada"], ["partial", "Contraste parcial"], ["pending", "Pendiente de contraste"]];
  const commitments = snapshot.commitments.filter((item) => (!topic || item.topics.includes(topic)) && (!status || item.review.status === status) && (!verdict || item.assessment.verdict === verdict) && terms.every((term) => normalizeMandateText([item.title, item.text, item.simpleExplanation, item.assessment.expected, item.assessment.practicalEffect, item.officialId, ...item.topics.map(topicLabel)].join(" ")).includes(term)));
  const indicators = snapshot.indicators.filter((item) => (!topic || item.topic === topic) && terms.every((term) => normalizeMandateText([item.label, item.explanation, item.geography, item.source.producer, topicLabel(item.topic)].join(" ")).includes(term)));
  const sourceCount = new Set([...snapshot.commitments.flatMap((item) => item.evidence.map((source) => source.url)), ...snapshot.indicators.map((item) => item.source.url), snapshot.election.source.url]).size;
  const visible = view === "commitments" ? commitments.length : indicators.length;
  const total = view === "commitments" ? snapshot.commitments.length : snapshot.indicators.length;
  function clearFilters() { setQuery(""); setTopic(""); setStatus(""); setVerdict(""); }
  function openReview(reviewStatus: Commitment["review"]["status"]) {
    setQuery(""); setTopic(""); setVerdict(""); setStatus(reviewStatus); setView("commitments");
    window.location.hash = "balance-documental";
    window.requestAnimationFrame(() => {
      document.getElementById("balance-documental")?.scrollIntoView({ block: "start" });
      document.getElementById("ledger-heading")?.focus({ preventScroll: true });
    });
  }
  function openAssessment(value: Commitment["assessment"]["verdict"]) {
    clearFilters(); setVerdict(value); setView("commitments");
    window.location.hash = "balance-documental";
    window.requestAnimationFrame(() => {
      document.getElementById("balance-documental")?.scrollIntoView({ block: "start" });
      document.getElementById("ledger-heading")?.focus({ preventScroll: true });
    });
  }
  function openRecord(kind: "commitments" | "indicators", id: string) {
    clearFilters(); setView(kind);
    // Wait for the target view to become visible before following its deep link.
    window.requestAnimationFrame(() => {
      const anchor = `${kind === "commitments" ? "compromiso" : "indicador"}-${id}`;
      document.getElementById(anchor)?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }
  return <div className="mn-app">
    <a href="#mandate-content" className="mn-skip">Saltar al contenido</a>
    <header className="mn-header"><Link href="/observatorio" className="mn-brand"><BookOpen size={25} aria-hidden="true" /><span>RegTrack<small>OBSERVATORIO PÚBLICO</small></span></Link><nav aria-label="Navegación del balance"><Link href="/observatorio"><ArrowLeft size={13} aria-hidden="true" /> Observatorio</Link><a href="#honestidad">Honestidad</a><a href="#balance-documental">Explorar el balance</a><a href="#preguntar-mandato">Preguntar</a></nav></header>
    <main id="mandate-content" className="mn-main">
      <section className="mn-hero" aria-labelledby="mandate-heading"><div>
        <p className="mn-eyebrow">Balance de mandato</p>
        <h1 id="mandate-heading">De los compromisos <br /><em>a la evidencia.</em></h1>
        <p className="mn-intro">{snapshot.mandate.label}. Una lectura de los compromisos recogidos, las actuaciones documentadas y la evolución de los indicadores, con sus fuentes a la vista.</p>
        <p className="mn-updated">Selección actualizada el <time dateTime={snapshot.asOf}>{dateLabel(snapshot.asOf)}</time><span>·</span>Inicio del mandato: {dateLabel(snapshot.mandate.start)}</p>
      </div><MandateCountdown election={snapshot.election} nowISO={nowISO} /></section>
      <MandateAccountability commitments={snapshot.commitments} calibration={snapshot.calibration} onReview={openReview} onAssessment={openAssessment} />
      <div className="mn-summary-grid" aria-label="Cobertura de la selección"><div><strong>{snapshot.commitments.length}</strong><span>compromisos en esta selección</span></div><div><strong>{snapshot.indicators.length}</strong><span>indicadores con periodo y unidad</span></div><div><strong>{sourceCount}</strong><span>referencias de origen distintas</span></div></div>
      <aside className="mn-method" aria-labelledby="method-heading"><h2 id="method-heading">Qué sabemos.<br />Qué queda por revisar.</h2><div><p>{snapshot.mandate.scope}</p><p>{snapshot.selection}</p><details className="mn-method-details"><summary>Ver método de contraste y límites</summary>{snapshot.methodology.map((point) => <p key={point}>{point}</p>)}</details></div></aside>
      <section id="balance-documental" className="mn-ledger" aria-labelledby="ledger-heading">
        <div className="mn-section-heading"><div><p className="mn-eyebrow">Un balance que se puede consultar</p><h2 id="ledger-heading" tabIndex={-1}>Abre las fichas. Sigue las fuentes.</h2></div><p>La información del Gobierno y el contraste documental del piloto RegTrack aparecen por separado en cada compromiso.</p></div>
        <div className="mn-tabs" aria-label="Contenido del balance"><button aria-pressed={view === "commitments"} onClick={() => setView("commitments")}>Compromisos <span>{snapshot.commitments.length}</span></button><button aria-pressed={view === "indicators"} onClick={() => setView("indicators")}>Indicadores <span>{snapshot.indicators.length}</span></button></div>
        <div className="mn-filters"><label className="mn-search"><span>Buscar en el balance</span><div><Search size={16} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Vivienda, empleo, una referencia…" /></div></label><label><span>Tema</span><select aria-label="Tema del balance" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">Todos los temas</option>{topics.map((id) => <option key={id} value={id}>{topicLabel(id)}</option>)}</select></label><label><span>Revisión RegTrack</span><select aria-label="Estado de revisión RegTrack" value={status} onChange={(event) => setStatus(event.target.value)} disabled={view === "indicators"}><option value="">Todos los estados</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <p className="mn-filter-note">{view === "commitments" ? "El estado describe la revisión de evidencia de cada ficha; no es una nota de cumplimiento del Gobierno." : "Los indicadores muestran observaciones. El filtro de revisión solo se aplica a los compromisos."}</p>
        <label className="mn-verdict-filter">Qué permite concluir la evidencia <select aria-label="Conclusión del contraste" value={verdict} onChange={(event) => setVerdict(event.target.value)} disabled={view === "indicators"}><option value="">Todas las conclusiones</option>{Object.entries(ASSESSMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="mn-results"><p role="status">{visible} de {total} {view === "commitments" ? "compromisos" : "indicadores"}</p>{query || topic || status || verdict ? <button onClick={clearFilters}>Limpiar filtros</button> : null}</div>
        {!visible ? <div className="mn-empty"><h3>No hay fichas con esta selección</h3><p>Prueba con otro término o amplía los filtros.</p><button onClick={clearFilters}>Ver todas las fichas</button></div> : null}
        <div className="mn-card-grid" hidden={view !== "commitments"}>{commitments.map((item) => <CommitmentCard key={item.id} item={item} indicators={snapshot.indicators} openIndicator={(id) => openRecord("indicators", id)} />)}</div>
        <div className="mn-card-grid" hidden={view !== "indicators"}>{indicators.map((indicator) => <IndicatorCard key={indicator.id} indicator={indicator} />)}</div>
      </section>
      {snapshot.commentary.map((commentary) => <section className="mn-interpretation" key={commentary.id} aria-labelledby={`interpretation-${commentary.id}`}>
        <div className="mn-interpretation-top"><span className="mn-ai-label"><Sparkles size={12} aria-hidden="true" /> Interpretación preparada con IA</span><time dateTime={commentary.createdAt}>{dateLabel(commentary.createdAt)}</time></div>
        <h2 id={`interpretation-${commentary.id}`}>{commentary.title}</h2><div className="mn-interpretation-text"><p>{commentary.text}</p><p><strong>Fichas utilizadas:</strong>{" "}{commentary.commitmentIds.map((id) => {
          const item = snapshot.commitments.find((candidate) => candidate.id === id);
          return item ? <a href={`#compromiso-${id}`} onClick={() => openRecord("commitments", id)} key={id}>{item.title}</a> : null;
        })}{commentary.indicatorIds.map((id) => { const item = snapshot.indicators.find((candidate) => candidate.id === id); return item ? <a href={`#indicador-${id}`} onClick={() => openRecord("indicators", id)} key={id}>{item.label}</a> : null; })}</p></div>
        <p className="mn-interpretation-note">{commentary.limitations} Comentario guardado, preparado con estas fichas; no se genera en directo al abrir la página.</p>
      </section>)}
      <MandateQuestion topic={topic} commitments={snapshot.commitments} indicators={snapshot.indicators} openRecord={openRecord} />
      <footer className="mn-footer"><span>RegTrack · Balance documental de una selección de compromisos</span><Link href="/observatorio/biblioteca">Consultar la biblioteca <ArrowUpRight size={13} aria-hidden="true" /></Link></footer>
    </main>
  </div>;
}
