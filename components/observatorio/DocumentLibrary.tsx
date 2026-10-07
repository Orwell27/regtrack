"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Database,
  Search,
  Link2,
} from "lucide-react";
import { SOURCE_CATALOG } from "@/lib/observatorio/catalog";
import type {
  PublicDocument,
  PublicLibrary,
} from "@/lib/observatorio/library";
import { TOPICS, normalize } from "@/lib/observatorio/model";

const STATES = {
  piloto: "En el piloto",
  candidato: "Candidata a integrar",
  referencia: "Referencia metodológica",
};
const KINDS = { norma: "Normativa", indicador: "Indicador" };
const SOURCE_ROLES = {
  fuente_primaria: "Fuente primaria",
  referente: "Referente",
  vocabulario: "Vocabulario",
};
const numberFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 12,
});

function dateLabel(value?: string) {
  if (!value) return "No indicada por la fuente";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Madrid",
      }).format(date);
}

function topicLabel(id: string) {
  return TOPICS.find((topic) => topic.id === id)?.name ?? readable(id);
}

function readable(value: string) {
  return value.replace(/[_-]/g, " ");
}

function DocumentCard({
  document,
  library,
  clearFilters,
  visible,
}: {
  document: PublicDocument;
  library: PublicLibrary;
  clearFilters: () => void;
  visible: boolean;
}) {
  const relations = library.relations.filter(
    (relation) => relation.from === document.key || relation.to === document.key,
  );
  return (
    <article
      id={document.key}
      className="dl-document"
      aria-labelledby={`title-${document.key}`}
      hidden={!visible}
    >
      <div className="dl-document-topline">
        <span className={`dl-kind dl-kind-${document.kind}`}>
          {KINDS[document.kind]}
        </span>
        <span>{document.publisher}</span>
        <a href={`#${document.key}`} className="dl-permalink" aria-label={`Enlace a ${document.title}`}>
          <Link2 size={15} aria-hidden="true" /> Enlace a esta ficha
        </a>
      </div>
      <h3 id={`title-${document.key}`}>{document.title}</h3>
      <div className="dl-tags" aria-label="Temas">
        {document.topics.map((topic) => <span key={topic}>{topicLabel(topic)}</span>)}
      </div>
      <div className="dl-summary">
        <span className="dl-eyebrow">Resumen editorial</span>
        <p>{document.summary}</p>
      </div>
      <dl className="dl-evidence-grid">
        <div><dt>Publicación</dt><dd>{dateLabel(document.publishedAt)}</dd></div>
        <div><dt>Captura conservada</dt><dd><time dateTime={document.observedAt}>{dateLabel(document.observedAt)}</time></dd></div>
        <div><dt>{document.territory.role === "jurisdiction" ? "Ámbito de la norma" : "Territorio medido"}</dt><dd>{document.territory.label} <small>· {document.territory.code}</small></dd></div>
        <div><dt>Perfiles de consulta</dt><dd>{document.profiles.map(readable).join(" · ") || "General"}</dd></div>
      </dl>
      {document.kind === "norma" ? (
        <p className="dl-legal-note">Se conserva la publicación de origen. El estado de vigencia no está verificado en esta ficha.</p>
      ) : null}
      {document.statistic ? (
        <section className="dl-statistic" aria-label={`Datos de ${document.title}`}>
          <div className="dl-statistic-heading">
            <h4>La serie, con sus unidades</h4>
            <p>{document.statistic.unit} · {document.statistic.frequency}</p>
          </div>
          <div className="dl-table-scroll" tabIndex={0} role="region" aria-label="Tabla de observaciones">
            <table>
              <caption>Periodos y valores recogidos de la fuente. Un dato no disponible no equivale a cero.</caption>
              <thead><tr><th scope="col">Periodo de la fuente</th><th scope="col">Valor</th></tr></thead>
              <tbody>{document.statistic.observations.map((observation, index) => (
                <tr key={`${observation.period}-${index}`}>
                  <th scope="row">{observation.period}</th>
                  <td>{observation.value === null ? <span className="dl-missing">No disponible</span> : numberFormat.format(observation.value)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="dl-series-code">Código de serie: <code>{document.statistic.seriesCode}</code></p>
        </section>
      ) : null}
      {relations.length > 0 ? (
        <section className="dl-relations" aria-label="Relaciones documentadas">
          <h4><Link2 size={16} aria-hidden="true" /> Contexto relacionado</h4>
          <p className="dl-muted">Estas relaciones ayudan a consultar el tema; no demuestran un efecto causal.</p>
          {relations.map((relation) => {
            const otherKey = relation.from === document.key ? relation.to : relation.from;
            const other = library.documents.find((item) => item.key === otherKey);
            return <div className="dl-relation" key={`${relation.from}-${relation.to}`}>
              {other ? <a href={`#${other.key}`} onClick={clearFilters}>{other.title} <span aria-hidden="true">↗</span></a> : null}
              <p>{relation.reason}</p>
              <p className="dl-relation-evidence"><strong>Base de la relación:</strong> {relation.evidence}</p>
            </div>;
          })}
        </section>
      ) : null}
      <div className="dl-document-actions">
        <a className="dl-original" href={document.sourceUrl} target="_blank" rel="noreferrer">Consultar fuente original <ArrowUpRight size={17} aria-hidden="true" /></a>
        <span>{document.documentId}</span>
      </div>
      <details className="dl-provenance">
        <summary>Ver trazabilidad y contenido conservado</summary>
        <div className="dl-provenance-content">
          <p>{document.reason}</p>
          <dl>
            <div><dt>Identificador del registro</dt><dd><code>{document.recordId}</code></dd></div>
            <div><dt>Versión conservada</dt><dd><code>{document.recordVersion}</code></dd></div>
            <div><dt>Huella del contenido · SHA-256</dt><dd><code>{document.contentHash}</code></dd></div>
            <div><dt>Captura, con hora</dt><dd><time dateTime={document.observedAt}>{document.observedAt}</time></dd></div>
            <div><dt>Contenido guardado</dt><dd>{readable(document.contentKind)}</dd></div>
            <div><dt>Condiciones de reutilización</dt><dd><a href={document.reuse.url} target="_blank" rel="noreferrer">{document.reuse.label} <ArrowUpRight size={13} aria-hidden="true" /></a><small> Comprobación: {dateLabel(document.reuse.checkedAt)}</small></dd></div>
          </dl>
          <h4>Contenido de esta captura</h4>
          <pre tabIndex={0} aria-label={`Contenido conservado de ${document.title}`}>{document.content}</pre>
        </div>
      </details>
    </article>
  );
}

export function DocumentLibrary({ library }: { library: PublicLibrary }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState("");
  const [sourceState, setSourceState] = useState("");
  const topics = [...new Set(library.documents.flatMap((document) => document.topics))];
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const visibleDocuments = new Set(library.documents.filter((document) => {
    const haystack = normalize([document.title, document.summary, document.publisher, document.documentId, document.territory.label, ...document.profiles, ...document.topics.map(topicLabel)].join(" "));
    return (!topic || document.topics.includes(topic)) && (!kind || document.kind === kind) && terms.every((term) => haystack.includes(term));
  }).map((document) => document.key));
  const clearFilters = () => { setQuery(""); setTopic(""); setKind(""); };
  const sources = SOURCE_CATALOG.filter((source) => !sourceState || source.state === sourceState);

  return (
    <div className="dl-app">
      <a className="dl-skip" href="#biblioteca-contenido">Saltar al contenido</a>
      <header className="dl-header">
        <Link href="/observatorio" className="dl-brand"><BookOpen size={26} aria-hidden="true" /><span>RegTrack<small>OBSERVATORIO PÚBLICO</small></span></Link>
        <nav aria-label="Navegación de biblioteca"><Link href="/observatorio"><ArrowLeft size={15} aria-hidden="true" /> Volver al observatorio</Link><a href="#catalogo-fuentes">Catálogo de fuentes</a></nav>
      </header>
      <main id="biblioteca-contenido" className="dl-main">
        <section className="dl-hero" aria-labelledby="library-heading">
          <div>
            <p className="dl-eyebrow">La evidencia, a la vista</p>
            <h1 id="library-heading">Una base para <br /><em>entender y contrastar.</em></h1>
            <p className="dl-intro">Documentos públicos, datos y relaciones que puedes seguir hasta su origen. Cada ficha conserva una captura identificable y distingue el contenido de la fuente de nuestra explicación.</p>
            <div className="dl-hero-meta"><span className="dl-pilot-dot" /> Biblioteca piloto <span>·</span><time dateTime={library.generatedAt}>Preparada el {dateLabel(library.generatedAt)}</time></div>
          </div>
          <aside className="dl-foundation" aria-label="Cómo se construye esta base">
            <Database size={25} strokeWidth={1.3} aria-hidden="true" />
            <h2>Del origen al contexto</h2>
            <ol><li><span>01</span><div><strong>Conservar</strong><p>La publicación y la versión consultada.</p></div></li><li><span>02</span><div><strong>Situar</strong><p>Tema, territorio, fecha y perfiles de consulta.</p></div></li><li><span>03</span><div><strong>Relacionar</strong><p>Con un motivo visible y sus límites.</p></div></li></ol>
          </aside>
        </section>

        <section className="dl-library-section" aria-labelledby="documents-heading">
          <div className="dl-section-heading"><div><p className="dl-eyebrow">Primera colección</p><h2 id="documents-heading">Vivienda, en documentos y datos</h2></div><p>{library.documents.length} fichas conservadas</p></div>
          <p className="dl-section-description">{library.coverage}</p>
          <div className="dl-filters">
            <label className="dl-search"><span>Buscar en la biblioteca</span><div><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tema, fuente, referencia…" /></div></label>
            <label><span>Tema</span><select aria-label="Tema" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">Todos los temas</option>{topics.map((value) => <option key={value} value={value}>{topicLabel(value)}</option>)}</select></label>
            <label><span>Tipo de documento</span><select aria-label="Tipo de documento" value={kind} onChange={(event) => setKind(event.target.value)}><option value="">Todos los tipos</option><option value="norma">Normativa</option><option value="indicador">Indicadores</option></select></label>
          </div>
          <div className="dl-result-status"><p role="status" aria-live="polite">{visibleDocuments.size} de {library.documents.length} fichas</p>{query || topic || kind ? <button onClick={clearFilters}>Limpiar filtros</button> : null}</div>
          {visibleDocuments.size === 0 ? <div className="dl-empty"><h3>No hay coincidencias en esta colección</h3><p>Prueba con otra palabra o amplía los filtros.</p><button onClick={clearFilters}>Ver todas las fichas</button></div> : null}
          <div className="dl-documents">{library.documents.map((document) => <DocumentCard key={document.key} document={document} library={library} clearFilters={clearFilters} visible={visibleDocuments.has(document.key)} />)}</div>
        </section>

        <section id="catalogo-fuentes" className="dl-catalog" aria-labelledby="sources-heading">
          <div className="dl-section-heading"><div><p className="dl-eyebrow">Fuentes y referentes</p><h2 id="sources-heading">Un catálogo con criterio</h2></div><label className="dl-catalog-filter"><span>Estado de integración</span><select aria-label="Estado de integración" value={sourceState} onChange={(event) => setSourceState(event.target.value)}><option value="">Todas las fuentes</option>{Object.entries(STATES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
          <p className="dl-section-description">Una institución de referencia puede ayudarnos a estructurar la información sin que sus datos estén incorporados. Aquí puedes comprobar qué función tiene cada fuente, cómo se accede a ella y qué queda por resolver.</p>
          <p className="dl-catalog-count" role="status" aria-live="polite">{sources.length} fuentes en esta selección</p>
          <div className="dl-source-grid">{sources.map((source) => (
            <article className="dl-source" key={source.id}>
              <div className="dl-source-topline"><span className={`dl-source-state dl-state-${source.state}`}>{STATES[source.state]}</span><span>{SOURCE_ROLES[source.role]}</span></div>
              <h3><a href={source.documentationUrl} target="_blank" rel="noreferrer">{source.name}<ArrowUpRight size={17} aria-hidden="true" /></a></h3>
              <p>{source.description}</p>
              <dl><div><dt>Cobertura</dt><dd>{source.coverage}</dd></div><div><dt>Detalle disponible</dt><dd>{source.granularity}</dd></div><div><dt>Acceso</dt><dd>{readable(source.access)}</dd></div><div><dt>Versiones</dt><dd>{source.versionStrategy}</dd></div><div><dt>Reutilización</dt><dd>{source.license.url ? <a href={source.license.url} target="_blank" rel="noreferrer">{source.license.label} <ArrowUpRight size={12} aria-hidden="true" /></a> : source.license.label}<small>Comprobación: {dateLabel(source.license.checkedAt)}</small></dd></div></dl>
              {source.limitations.length ? <details className="dl-source-limits"><summary>Límites y condiciones</summary><ul>{source.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></details> : null}
            </article>
          ))}</div>
        </section>
        <footer className="dl-footer"><span>RegTrack · Información pública con trazabilidad</span><Link href="/observatorio">Explorar el observatorio <ArrowUpRight size={15} aria-hidden="true" /></Link></footer>
      </main>
    </div>
  );
}
