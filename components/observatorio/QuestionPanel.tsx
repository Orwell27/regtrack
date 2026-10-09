"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { ArrowUpRight, ArrowRight, Search, BookOpen } from "lucide-react";
import {
  KIND_LABELS,
  searchStories,
  type Story,
  type Filters,
} from "@/lib/observatorio/model";
import type { CitedParagraph } from "@/lib/observatorio/answer";
type Answer = {
  query: string;
  stories: Story[];
  scope: string;
  paragraphs?: CitedParagraph[];
  note?: string;
};
export function QuestionPanel({
  stories,
  scope,
  onSearch,
  loading,
  filters,
}: {
  stories: Story[];
  scope: string;
  onSearch: (query: string) => void;
  loading: boolean;
  filters: Filters;
}) {
  const [query, setQuery] = useState(""),
    [answer, setAnswer] = useState<Answer | null>(null);
  const [explaining, setExplaining] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function ask(event?: FormEvent, value = query) {
    event?.preventDefault();
    if (value.trim().length < 3 || loading) return;
    setQuery(value);
    setAnswer({ query: value, stories: searchStories(stories, value), scope });
    onSearch(value);
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setExplaining(true);
    try {
      const response = await fetch("/api/observatorio/preguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value, filters }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (response.ok && result.mode === "ia")
        setAnswer({
          query: value,
          stories: result.sources,
          scope,
          paragraphs: result.paragraphs,
        });
      else if (!response.ok)
        setAnswer((previous) =>
          previous
            ? {
                ...previous,
                note:
                  response.status === 401 || response.status === 403
                    ? "La explicación con IA está limitada al piloto con sesión de administrador. Puedes consultar las referencias documentales."
                    : (result.error ??
                      "No se pudo redactar una explicación. Conservamos las referencias documentales."),
              }
            : previous,
        );
    } catch {
      if (!controller.signal.aborted)
        setAnswer((previous) =>
          previous
            ? {
                ...previous,
                note: "No se pudo consultar la explicación. Puedes seguir leyendo las referencias.",
              }
            : previous,
        );
    } finally {
      if (!controller.signal.aborted) setExplaining(false);
    }
  }
  return (
    <section className="ob-question" aria-labelledby="question-heading">
      <div className="ob-section-kicker">
        <BookOpen size={15} />
        PREGUNTA AL OBSERVATORIO
      </div>
      <h2 id="question-heading">
        La actualidad,
        <br />
        <em>con contexto.</em>
      </h2>
      <p>
        Plantea una pregunta. Encontraremos referencias entre las publicaciones
        de tu selección.
      </p>
      <form onSubmit={ask} className="ob-question-form">
        <label htmlFor="ob-question-input">Tu pregunta</label>
        <textarea
          id="ob-question-input"
          maxLength={500}
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="¿Qué novedades hay sobre vivienda?"
        />
        <div>
          <small>{scope}</small>
          <button
            disabled={loading || explaining || query.trim().length < 3}
            aria-label="Lanzar pregunta"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </form>
      <div className="ob-suggestions">
        <span>PRUEBA CON</span>
        {[
          "¿Qué novedades hay sobre vivienda?",
          "¿Qué se publica sobre empleo?",
          "¿Qué análisis hay sobre economía?",
        ].map((q) => (
          <button key={q} disabled={loading} onClick={() => ask(undefined, q)}>
            {q}
            <ArrowUpRight size={13} />
          </button>
        ))}
      </div>
      {answer ? (
        <div className="ob-answer" aria-live="polite">
          <div className="ob-section-kicker">
            <Search size={13} />
            {answer.paragraphs
              ? "EXPLICACIÓN CON IA Y REFERENCIAS"
              : "RESPUESTA DOCUMENTAL"}
          </div>
          <h3>{answer.query}</h3>
          {explaining ? (
            <p role="status">Consultando la explicación disponible…</p>
          ) : null}
          {answer.paragraphs?.map((p, i) => (
            <p className="ob-answer-paragraph" key={i}>
              {p.text}{" "}
              {p.citations.map((n) => (
                <a
                  key={n}
                  href={answer.stories[n - 1].url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Referencia ${n}: ${answer.stories[n - 1].source}`}
                >
                  [{n}]
                </a>
              ))}
            </p>
          ))}
          {answer.note ? (
            <p className="ob-answer-limit">{answer.note}</p>
          ) : null}
          <p>
            {answer.stories.length
              ? `He encontrado ${answer.stories.length} referencias relacionadas en ${answer.scope}. Esto es lo que publican las fuentes:`
              : `No he encontrado referencias suficientes en ${answer.scope}. Amplía el periodo, cambia de tema o prueba otra formulación. Esto no demuestra que no existan novedades.`}
          </p>
          {answer.stories.map((s, i) => (
            <article key={s.id}>
              <span>
                {i + 1}. {KIND_LABELS[s.kind]} · {s.source}
              </span>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
                <ArrowUpRight size={12} />
              </a>
              {s.excerpt ? <p>{s.excerpt}</p> : null}
            </article>
          ))}
          <p className="ob-answer-limit">
            Consulta sobre titulares y extractos, sin lectura jurídica del
            documento completo. No confirma requisitos, plazos ni obligaciones
            personales. Las opiniones pertenecen a sus autores.
          </p>
          {scope !== answer.scope ? (
            <p>
              La selección ha cambiado. Vuelve a preguntar para actualizar la
              respuesta.
            </p>
          ) : null}
          <button
            className="ob-text-button"
            onClick={() => {
              activeRequest.current?.abort();
              setExplaining(false);
              setAnswer(null);
            }}
          >
            Cerrar respuesta
          </button>
        </div>
      ) : null}
    </section>
  );
}
