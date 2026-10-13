"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { MANDATE_TOPICS, type MandateAnswer, type Commitment, type Indicator } from "@/lib/mandate/model";

type SavedAnswer = { question: string; topic: string; response: MandateAnswer };

export function MandateQuestion({ topic, commitments, indicators, openRecord }: {
  topic: string;
  commitments: Commitment[];
  indicators: Indicator[];
  openRecord: (kind: "commitments" | "indicators", id: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [withAI, setWithAI] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<SavedAnswer | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function ask(event?: FormEvent, value = question) {
    event?.preventDefault();
    const query = value.trim();
    if (query.length < 3 || busy) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 40_000);
    setQuestion(query);
    setBusy(true);
    setError("");
    setAnswer(null);
    try {
      const response = await fetch("/api/observatorio/mandato/preguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, topic: topic || undefined, mode: withAI ? "ia" : "documental" }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(response.status === 401 || response.status === 403
          ? "La explicación con IA requiere acceso habilitado. Puedes desmarcarla y consultar las referencias documentales."
          : typeof result.error === "string" ? result.error : "No se pudo consultar la base documental. Vuelve a intentarlo.");
        return;
      }
      if (!Array.isArray(result.paragraphs) || !Array.isArray(result.sources) || !["ia", "documental", "no-evidence"].includes(result.mode)) {
        setError("La respuesta no tiene el formato esperado. Vuelve a intentarlo.");
        return;
      }
      setAnswer({ question: query, topic, response: result as MandateAnswer });
    } catch {
      if (active.current === controller) setError("No se pudo completar la consulta. Las fichas y sus fuentes siguen disponibles.");
    } finally {
      window.clearTimeout(timeout);
      if (active.current === controller) setBusy(false);
    }
  }

  return <section id="preguntar-mandato" className="mn-question" aria-labelledby="mandate-question-heading">
    <div className="mn-question-intro">
      <span className="mn-eyebrow">Pregunta a las fuentes</span>
      <h2 id="mandate-question-heading">Una pregunta.<br />Un punto de partida.</h2>
      <p>Consulta los compromisos, las actuaciones documentadas y los indicadores de esta selección nacional. Cada respuesta debe poder contrastarse.</p>
      <p><Link href="/observatorio/mandato/cobertura">Ver inventario completo y cobertura territorial</Link></p>
    </div>
    <div>
      <form className="mn-question-form" onSubmit={ask}>
        <label htmlFor="mn-question">Tu pregunta sobre el mandato</label>
        <div className="mn-question-input">
          <textarea id="mn-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} rows={3} placeholder="¿Qué está documentado sobre vivienda?" />
          <div className="mn-question-controls"><small>{topic ? `Tema: ${MANDATE_TOPICS[topic] ?? topic}` : "Todos los temas de esta selección"}</small><button disabled={busy || question.trim().length < 3} type="submit">Consultar <ArrowRight size={16} aria-hidden="true" /></button></div>
        </div>
        <label className="mn-question-mode"><input type="checkbox" checked={withAI} onChange={(event) => setWithAI(event.target.checked)} disabled={busy} /><span>Ampliar con una explicación de IA · requiere acceso habilitado</span></label>
      </form>
      <div className="mn-suggestions" aria-label="Preguntas sugeridas">
        {["¿Cómo se mide la honestidad?", "¿Qué está documentado sobre vivienda?", "¿Cómo ha evolucionado el empleo?", "¿Qué falta por revisar?"].map((suggestion) => <button key={suggestion} disabled={busy} onClick={() => ask(undefined, suggestion)}>{suggestion}</button>)}
      </div>
      {busy ? <p className="mn-question-busy" role="status">Consultando las referencias de esta selección…</p> : null}
      {error ? <p className="mn-error" role="alert">{error}</p> : null}
      {answer ? <div className="mn-answer" aria-live="polite">
        <span className="mn-eyebrow">{answer.response.mode === "ia" ? "Explicación con IA y fuentes" : answer.response.mode === "no-evidence" ? "Evidencia insuficiente" : "Respuesta documental"}</span>
        <h3>{answer.question}</h3>
        {answer.response.paragraphs.map((paragraph, index) => <p key={index}>{paragraph.text}{" "}{paragraph.citations.map((id) => {
          const sourceIndex = answer.response.sources.findIndex((source) => source.id === id);
          const source = answer.response.sources[sourceIndex];
          return source ? <a href={source.url} target="_blank" rel="noreferrer" key={id} aria-label={`Fuente ${sourceIndex + 1}: ${source.title}`}>[{sourceIndex + 1}] </a> : null;
        })}</p>)}
        {answer.response.sources.length ? <ol className="mn-answer-sources">{answer.response.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} <ArrowUpRight size={11} aria-hidden="true" /></a><span> · {source.producer}</span></li>)}</ol> : null}
        {answer.response.commitmentIds.length || answer.response.indicatorIds.length ? <div className="mn-answer-records"><p><strong>Fichas de esta respuesta</strong></p><ul className="mn-answer-sources">
          {answer.response.commitmentIds.map((id) => { const item = commitments.find((candidate) => candidate.id === id); return item ? <li key={id}><a href={`#compromiso-${id}`} onClick={() => openRecord("commitments", id)}>{item.title}</a></li> : null; })}
          {answer.response.indicatorIds.map((id) => { const item = indicators.find((candidate) => candidate.id === id); return item ? <li key={id}><a href={`#indicador-${id}`} onClick={() => openRecord("indicators", id)}>{item.label}</a></li> : null; })}
        </ul></div> : null}
        <p className="mn-answer-note">{answer.response.note}</p>
        {topic !== answer.topic ? <p className="mn-answer-note">El tema seleccionado ha cambiado. Vuelve a preguntar para usar la nueva selección.</p> : null}
      </div> : null}
    </div>
  </section>;
}
