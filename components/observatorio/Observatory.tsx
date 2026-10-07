"use client";
import { useEffect, useMemo, useState, useDeferredValue, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  SlidersHorizontal,
  Search,
  ChevronRight,
  RefreshCw,
  Info,
  X,
  Library,
  TrendingUp,
} from "lucide-react";
import {
  DEFAULT_FILTERS,
  TOPICS,
  KIND_LABELS,
  classifyTopics,
  filterStories,
  popularTopics,
  normalize,
  readableTitle,
  type Bulletin,
  type Filters,
  type Territory,
  type Story,
} from "@/lib/observatorio/model";
import { ALL_SOURCES, REFERENCE_DIRECTORY } from "@/lib/observatorio/sources";
import { TerritoryMap } from "./TerritoryMap";
import { QuestionPanel } from "./QuestionPanel";
import { ElectionNotice } from "./ElectionNotice";
import type { Election } from "@/lib/mandate/model";

const EMPTY: Bulletin = { stories: [], sources: [], checkedAt: "" };
type SearchCount = { topic: string; at: number };
function readSearchHistory(): SearchCount[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(
        localStorage.getItem("regtrack.observatorio.searches.v1") ?? "[]",
      ),
      now = Date.now();
    return Array.isArray(saved)
      ? saved
          .filter(
            (v) =>
              TOPICS.some((t) => t.id === v?.topic) &&
              Number.isFinite(v.at) &&
              v.at > now - 7 * 86400000 &&
              v.at <= now,
          )
          .slice(-100)
      : [];
  } catch {
    return [];
  }
}
function dateLabel(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Madrid",
      }).format(new Date(value))
    : "Fecha no indicada";
}
function StoryCard({ story }: { story: Story }) {
  return (
    <article className="ob-story">
      <div className="ob-story-meta">
        <span className={`ob-type ob-${story.kind}`}>
          {KIND_LABELS[story.kind]}
        </span>
        <time dateTime={story.publishedAt ?? undefined}>
          {dateLabel(story.publishedAt)}
        </time>
      </div>
      <h3>
        <a href={story.url} target="_blank" rel="noreferrer">
          {readableTitle(story)}
          <ArrowUpRight size={17} />
        </a>
      </h3>
      {readableTitle(story) !== story.title ? (
        <details className="ob-official-title">
          <summary>Título oficial completo</summary>
          <p>{story.title}</p>
        </details>
      ) : null}
      {story.excerpt ? <p>{story.excerpt}</p> : null}
      {story.relatedDocuments?.length ? (
        <div className="ob-related">
          <strong>Relacionado con</strong>
          {story.relatedDocuments.map((document) => (
            <div key={document.id}>
              <a href={document.url} target="_blank" rel="noreferrer">
                {document.title} <ArrowUpRight size={13} />
              </a>
              <small>{document.reason}</small>
              {document.libraryKey ? <a href={`/observatorio/biblioteca#${document.libraryKey}`}>Ver evidencia conservada</a> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="ob-story-topics">
        {story.topics.slice(0, 3).map((t) => (
          <span key={t}>{TOPICS.find((topic) => topic.id === t)?.name}</span>
        ))}
      </div>
      {story.libraryKey ? <a className="ob-library-link" href={`/observatorio/biblioteca#${story.libraryKey}`}>Ver ficha y evidencia conservada <ArrowRight size={14} /></a> : null}
      <footer>
        <span>
          <strong>{story.source}</strong>
          <small>{story.author ?? "Autor no indicado en el canal"}</small>
        </span>
        <a
          href={story.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Leer original: ${story.title}`}
        >
          <ArrowUpRight size={17} />
        </a>
      </footer>
    </article>
  );
}

export function Observatory({ election, nowISO }: { election: Election; nowISO: string }) {
  const [data, setData] = useState<Bulletin>(EMPTY),
    [territories, setTerritories] = useState<Territory[]>([]),
    [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [geoError, setGeoError] = useState(false),
    [reload, setReload] = useState(0);
  const [place, setPlace] = useState(""),
    [limit, setLimit] = useState(12),
    [directory, setDirectory] = useState(false),
    [searches, setSearches] = useState<SearchCount[]>(readSearchHistory),
    [trendMode, setTrendMode] = useState<"news" | "searches">("news");
  const deferredPlace = useDeferredValue(place);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (directory && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [directory]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    Promise.allSettled([
      fetch("/api/observatorio", { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((d) => {
          if (active) {
            setData(d);
            setError("");
          }
        })
        .catch((e) => {
          if (active && e.name !== "AbortError")
            setError(
              "No se pudieron actualizar las fuentes. Vuelve a intentarlo.",
            );
        }),
      fetch("/observatorio/geo/territories.json", { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((d) => {
          if (active) {
            setTerritories(d);
            setGeoError(false);
          }
        })
        .catch((e) => {
          if (active && e.name !== "AbortError") setGeoError(true);
        }),
    ]).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [reload]);
  const selected = territories.find((t) => t.id === filters.territory);
  const regions = territories.filter((t) => t.level === "region"),
    provinces = territories.filter(
      (t) => t.level === "province" && t.region === selected?.region,
    ),
    municipalities = territories.filter(
      (t) => t.level === "municipality" && t.province === selected?.province,
    );
  const suggestions = useMemo(
    () =>
      deferredPlace.trim().length < 2
        ? []
        : territories
            .filter((t) => normalize(t.name).includes(normalize(deferredPlace)))
            .slice(0, 8),
    [deferredPlace, territories],
  );
  const snapshotTime = data.checkedAt ? Date.parse(data.checkedAt) : 0;
  const filtered = useMemo(
    () => filterStories(data.stories, filters, snapshotTime),
    [data, filters, snapshotTime],
  );
  const territorial = useMemo(
    () => filterStories(data.stories, { ...filters, topic: "" }, snapshotTime),
    [data, filters, snapshotTime],
  );
  const mapStories = useMemo(
    () =>
      filterStories(data.stories, { ...filters, territory: "" }, snapshotTime),
    [data, filters, snapshotTime],
  );
  const trends = useMemo(() => popularTopics(territorial), [territorial]);
  const searchTrends = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of searches)
      if (s.at > snapshotTime - 7 * 86400000)
        counts.set(s.topic, (counts.get(s.topic) ?? 0) + 1);
    return TOPICS.filter((t) => counts.has(t.id))
      .map((t) => ({ ...t, count: counts.get(t.id)! }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [searches, snapshotTime]);
  const activeSources = data.sources.filter((s) => s.state === "ok").length;
  const scope = [
    selected?.name ?? "España",
    TOPICS.find((t) => t.id === filters.topic)?.name,
    filters.kind ? KIND_LABELS[filters.kind as keyof typeof KIND_LABELS] : "",
    filters.source
      ? ALL_SOURCES.find((s) => s.id === filters.source)?.name
      : "",
    filters.days
      ? `últimos ${filters.days} días`
      : "todo el archivo disponible",
    filters.includeNational ? "incluye menciones nacionales" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  function change(patch: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(12);
  }
  function select(id: string) {
    change({ territory: id });
    setPlace("");
  }
  function record(query: string) {
    const topics = classifyTopics(query).filter((t) => t !== "otros");
    const next = [
      ...searches.filter((s) => s.at > Date.now() - 7 * 86400000),
      ...topics.map((topic) => ({ topic, at: Date.now() })),
    ].slice(-100);
    setSearches(next);
    try {
      localStorage.setItem(
        "regtrack.observatorio.searches.v1",
        JSON.stringify(next),
      );
    } catch {}
  }
  function refresh() {
    setLoading(true);
    setReload((n) => n + 1);
  }
  return (
    <div className="ob-app">
      <header className="ob-header">
        <a href="/observatorio" className="ob-brand">
          <Globe2 size={25} />
          <span>
            RegTrack<span>OBSERVATORIO PÚBLICO</span>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#territorio">Territorio</a>
          <a href="#actualidad">Actualidad</a>
          <a href="/observatorio/biblioteca">Biblioteca</a>
          <a href="/observatorio/mandato">Balance de mandato</a>
          <button onClick={() => setDirectory(true)}>Fuentes</button>
        </nav>
        <a className="ob-account" href="/login">
          Mi cuenta
          <ArrowUpRight size={15} />
        </a>
      </header>
      <main className="ob-main">
        <div className="ob-intro">
          <div>
            <div className="ob-section-kicker">
              <span className="ob-dot" /> UNA MIRADA PÚBLICA, MUCHAS
              PERSPECTIVAS
            </div>
            <h1>
              España, <em>en contexto.</em>
            </h1>
            <p>
              Explora tu territorio. Conecta las noticias. Entiende lo que
              cambia.
            </p>
          </div>
          <div className="ob-edition">
            <span>EDICIÓN ABIERTA</span>
            <strong>
              {data.checkedAt
                ? new Intl.DateTimeFormat("es-ES", {
                    dateStyle: "long",
                    timeZone: "Europe/Madrid",
                  }).format(new Date(data.checkedAt))
                : "Consultando fuentes"}
            </strong>
            <button onClick={refresh} disabled={loading}>
              <RefreshCw size={12} className={loading ? "ob-spinning" : ""} />
              {loading
                ? "Actualizando…"
                : `Consultado a las ${new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date(data.checkedAt || "1970-01-01"))}`}
            </button>
          </div>
        </div>
        <ElectionNotice election={election} nowISO={nowISO} />
        {error ? (
          <div className="ob-notice" role="alert">
            {error}
            <button onClick={refresh}>Reintentar</button>
          </div>
        ) : null}
        {geoError ? (
          <div className="ob-notice" role="alert">
            El índice territorial no se ha cargado.
            <button onClick={refresh}>Reintentar</button>
          </div>
        ) : null}
        <section className="ob-trending" aria-label="Temas populares">
          <div className="ob-trend-label">
            <TrendingUp size={17} />
            <button
              aria-pressed={trendMode === "news"}
              onClick={() => setTrendMode("news")}
            >
              En la actualidad
            </button>
            <span>/</span>
            <button
              aria-pressed={trendMode === "searches"}
              onClick={() => setTrendMode("searches")}
            >
              Tus búsquedas
            </button>
          </div>
          <div className="ob-trend-pills">
            {(trendMode === "news" ? trends : searchTrends).map((t, i) => (
              <button
                key={t.id}
                className={filters.topic === t.id ? "is-active" : ""}
                onClick={() =>
                  change({ topic: filters.topic === t.id ? "" : t.id })
                }
              >
                <small>{String(i + 1).padStart(2, "0")}</small>
                {t.name}
                <span>{t.count}</span>
              </button>
            ))}
            {!loading &&
            !(trendMode === "news" ? trends : searchTrends).length ? (
              <span className="ob-muted">
                {trendMode === "news"
                  ? "Sin publicaciones para calcular tendencias."
                  : "Tus consultas irán destacando temas aquí."}
              </span>
            ) : null}
            {loading && !trends.length ? (
              <span className="ob-muted">Leyendo los canales públicos…</span>
            ) : null}
          </div>
          <p>
            {trendMode === "news"
              ? "Por número de publicaciones recogidas en tu selección. No es una medición de popularidad social."
              : "Temas de tus preguntas de los últimos 7 días, solo en este navegador."}
            {trendMode === "searches" && searches.length ? (
              <button
                className="ob-text-button"
                onClick={() => {
                  setSearches([]);
                  try {
                    localStorage.removeItem(
                      "regtrack.observatorio.searches.v1",
                    );
                  } catch {}
                }}
              >
                Borrar historial
              </button>
            ) : null}
          </p>
        </section>
        <section
          id="territorio"
          className="ob-explore"
          aria-labelledby="explore-heading"
        >
          <div className="ob-section-heading">
            <div>
              <span className="ob-number">01 / EXPLORAR</span>
              <h2 id="explore-heading">Cada lugar tiene su contexto.</h2>
            </div>
            <div className="ob-stats">
              <strong>
                {data.stories.length}
                <small>PUBLICACIONES</small>
              </strong>
              <strong>
                {activeSources}
                <small>CANALES RECIENTES</small>
              </strong>
            </div>
          </div>
          <div className="ob-filters">
            <div className="ob-filter-label">
              <SlidersHorizontal size={16} />
              Tu selección
            </div>
            <label>
              Tema
              <select
                aria-label="Tema"
                value={filters.topic}
                onChange={(e) => change({ topic: e.target.value })}
              >
                <option value="">Todos los temas</option>
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comunidad
              <select
                aria-label="Comunidad"
                value={selected?.region ?? ""}
                onChange={(e) => select(e.target.value)}
              >
                <option value="">Toda España</option>
                {regions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Provincia
              <select
                aria-label="Provincia"
                value={
                  selected && selected.level !== "region"
                    ? selected.province
                    : ""
                }
                disabled={!selected}
                onChange={(e) =>
                  select(e.target.value || selected?.region || "")
                }
              >
                <option value="">Todas las provincias</option>
                {provinces.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Municipio
              <select
                aria-label="Municipio"
                value={selected?.level === "municipality" ? selected.id : ""}
                disabled={!selected || selected.level === "region"}
                onChange={(e) =>
                  select(e.target.value || selected?.province || "")
                }
              >
                <option value="">Todos los municipios</option>
                {municipalities.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Periodo
              <select
                aria-label="Periodo"
                value={filters.days}
                onChange={(e) => change({ days: Number(e.target.value) })}
              >
                <option value={1}>Últimas 24 horas</option>
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={0}>Archivo disponible</option>
              </select>
            </label>
          </div>
          <div className="ob-territory-search">
            <div className="ob-place-search">
              <Search size={16} />
              <label className="ob-sr-only" htmlFor="ob-place">
                Buscar un lugar de España
              </label>
              <input
                id="ob-place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Busca cualquier municipio, provincia o comunidad…"
                autoComplete="off"
              />
              {place ? (
                <button
                  aria-label="Limpiar búsqueda de lugar"
                  onClick={() => setPlace("")}
                >
                  <X size={15} />
                </button>
              ) : null}
              {place.length >= 2 ? (
                <div className="ob-place-options">
                  {suggestions.map((t) => (
                    <button key={t.id} onClick={() => select(t.id)}>
                      {t.name}
                      <small>
                        {t.level === "municipality"
                          ? "Municipio"
                          : t.level === "province"
                            ? "Provincia"
                            : "Comunidad"}{" "}
                        · {territories.find((p) => p.id === t.region)?.name}
                      </small>
                    </button>
                  ))}
                  {!suggestions.length ? (
                    <p>No hay coincidencias en el índice territorial.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              className="ob-text-button"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setLimit(12);
                setPlace("");
              }}
            >
              Restablecer filtros
            </button>
          </div>
          <div className="ob-explore-grid">
            <TerritoryMap
              territories={territories}
              selected={selected}
              stories={mapStories}
              onSelect={select}
            />
            <QuestionPanel
              filters={filters}
              stories={filtered}
              scope={scope}
              onSearch={record}
              loading={loading}
            />
          </div>
        </section>
        <section
          id="actualidad"
          className="ob-news"
          aria-labelledby="news-heading"
        >
          <div className="ob-section-heading">
            <div>
              <span className="ob-number">02 / ACTUALIDAD Y PERSPECTIVAS</span>
              <h2 id="news-heading">
                El tablón de {selected?.name ?? "España"}.
              </h2>
            </div>
            <span className="ob-result-count" role="status">
              {loading
                ? "Actualizando…"
                : `${filtered.length} publicaciones en tu selección`}
            </span>
          </div>
          <div className="ob-news-controls">
            <div className="ob-kind-tabs" aria-label="Tipo de publicación">
              {[
                ["", "Todas las fuentes"],
                ["oficial", "Oficial"],
                ["noticia", "Noticias"],
                ["analisis", "Análisis y opinión"],
              ].map(([id, name]) => (
                <button
                  key={id}
                  aria-pressed={filters.kind === id}
                  onClick={() => change({ kind: id })}
                >
                  {name}
                </button>
              ))}
            </div>
            <label className="ob-source-select">
              <span className="ob-sr-only">Filtrar por fuente</span>
              <select
                aria-label="Filtrar por fuente"
                value={filters.source}
                onChange={(e) => change({ source: e.target.value })}
              >
                <option value="">Todos los canales</option>
                {ALL_SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selected ? (
            <div className="ob-coverage">
              <Info size={16} />
              <span>
                Se muestran menciones a {selected.name}. La cobertura municipal
                aún depende de lo que recogen los canales conectados; no incluye
                todos los boletines locales.
              </span>
              <label>
                <input
                  type="checkbox"
                  checked={filters.includeNational}
                  onChange={(e) =>
                    change({ includeNational: e.target.checked })
                  }
                />
                Añadir menciones nacionales
              </label>
            </div>
          ) : (
            <p className="ob-list-note">
              Publicaciones oficiales y noticias relacionadas con documentos
              identificados en el observatorio. Cada noticia explica su vínculo
              y permite consultar la referencia original.
            </p>
          )}
          {!loading && !error && filters.kind !== "oficial" && !filtered.some((s) => s.kind !== "oficial") ? (
            <p className="ob-list-note">
              No se han identificado noticias con una referencia documental verificable
              en esta selección. Coincidir en tema o territorio no basta para incluirlas.
            </p>
          ) : null}
          {filtered.length ? (
            <div className="ob-news-grid">
              {filtered.slice(0, limit).map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="ob-empty">
              <Library size={30} />
              <h3>
                {loading
                  ? "Preparando tu edición…"
                  : "No hay publicaciones con estos filtros."}
              </h3>
              <p>
                {loading
                  ? "Consultamos las fuentes; el mapa ya se puede explorar."
                  : "Prueba un periodo más amplio o cambia de territorio. La ausencia de resultados no garantiza que no haya novedades."}
              </p>
              {!loading ? (
                <button
                  onClick={() =>
                    change({ topic: "", kind: "", source: "", days: 0 })
                  }
                >
                  Ampliar la búsqueda
                  <ArrowRight size={15} />
                </button>
              ) : null}
            </div>
          )}
          {filtered.length > limit ? (
            <button
              className="ob-load-more"
              onClick={() => setLimit((n) => n + 12)}
            >
              Ver más publicaciones
              <ChevronRight size={16} />
            </button>
          ) : null}
        </section>
        <section className="ob-method">
          <div>
            <div className="ob-section-kicker">CONTEXTO, CON PROCEDENCIA</div>
            <h2>
              Una fuente informa.
              <br />
              <em>Varias ayudan a entender.</em>
            </h2>
          </div>
          <div>
            <p>
              Contrastamos perspectivas manteniendo visible quién publica qué.
              Las normas, las noticias y las opiniones tienen etiquetas
              diferentes.
            </p>
            <button onClick={() => setDirectory(true)}>
              Ver fuentes y cobertura
              <ArrowUpRight size={17} />
            </button>
          </div>
        </section>
        <footer className="ob-footer">
          <span>
            RegTrack <small>OBSERVATORIO PÚBLICO</small>
          </span>
          <span>Geografía: IGN · Selección editorial abierta</span>
          <a href="/comunidad">
            Comunidad de propietarios
            <ArrowUpRight size={13} />
          </a>
        </footer>
      </main>
      {directory ? (
        <dialog
          ref={dialog}
          onCancel={() => setDirectory(false)}
          className="ob-directory-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDirectory(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="directory-heading"
            className="ob-directory"
            onKeyDown={(e) => {
              if (e.key === "Escape") setDirectory(false);
            }}
          >
            <button
              autoFocus
              className="ob-directory-close"
              onClick={() => setDirectory(false)}
              aria-label="Cerrar fuentes"
            >
              <X size={22} />
            </button>
            <div className="ob-section-kicker">PROCEDENCIA Y COBERTURA</div>
            <h2 id="directory-heading">Una selección para contrastar.</h2>
            <p>
              Fuentes generales, territoriales y análisis de especialistas. La
              selección inicial no representa todas las perspectivas. Publicamos
              referencias, no artículos completos ni contenido tras muros de
              pago.
            </p>
            <h3>Canales conectados</h3>
            {ALL_SOURCES.map((s) => {
              const status = data.sources.find((d) => d.id === s.id);
              return (
                <article key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                    <ArrowUpRight size={14} />
                  </a>
                  <span
                    className={`ob-source-state ob-state-${status?.state ?? "pending"}`}
                  >
                    {!status
                      ? "Pendiente de consulta"
                      : status.state === "ok"
                        ? `${status.includedCount ?? status.count} incluidas de ${status.count} recibidas`
                        : status.state === "stale"
                          ? "Archivo · sin novedades recientes"
                          : status.state === "empty"
                            ? "Sin entradas"
                            : "No disponible"}
                  </span>
                  <p>{s.description}</p>
                  {status?.latest ? (
                    <small>
                      Última publicación recibida: {dateLabel(status.latest)}
                    </small>
                  ) : null}
                </article>
              );
            })}
            <h3>Referencias complementarias · consulta externa</h3>
            <p>Estos recursos aún no alimentan automáticamente el tablón.</p>
            {REFERENCE_DIRECTORY.map((s) => (
              <article key={s.name}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                  <ArrowUpRight size={14} />
                </a>
                <p>{s.description}</p>
              </article>
            ))}
            <h3>Cómo leer el observatorio</h3>
            <p>
              Las noticias y opiniones solo se incluyen cuando el canal cita un
              identificador del BOE o una norma concreta que coincide de forma
              inequívoca con un documento oficial consultado. El vínculo acredita
              una referencia, no la exactitud de la noticia ni la vigencia de la norma.
              La coincidencia de tema o lugar no es suficiente. Los canales que no
              incluyen esas referencias pueden quedar sin noticias seleccionadas.
              Por ahora, la vinculación usa documentos públicos del BOE; las alertas
              privadas y los expedientes internos no se publican aquí.
            </p>
            <p>
              Los temas se asignan automáticamente por palabras del titular y
              extracto; pueden contener errores. Los lugares identifican
              menciones y el canal territorial, no obligaciones legales. Los
              filtros de fecha solo consultan las entradas disponibles en los
              canales: todavía no hay un archivo histórico continuo. Los canales
              se vuelven a consultar como máximo cada 15 minutos al visitar la
              página. Las búsquedas personales se guardan por temas durante 7
              días en tu navegador y se pueden borrar.
            </p>
            <button
              className="ob-load-more"
              onClick={() => setDirectory(false)}
            >
              Volver al observatorio
            </button>
          </section>
        </dialog>
      ) : null}
    </div>
  );
}
