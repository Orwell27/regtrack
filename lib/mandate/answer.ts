import { normalizeMandateText, type Commitment, type Indicator, type MandateAnswer, type MandateSnapshot } from "./model";
import type { Story } from "../observatorio/model";

const STOP = new Set("que como cual cuales cuanto cuantos cuando donde para por del las los una unos unas este esta esto esos esas sobre desde hasta entre durante hay han sido tiene tienen dame dime explica informacion gobierno sanchez pedro mandato promesa promesas prometio prometido cumplio cumplido cumplida cumplidas incumplida incumplidas hecho hacer puede podemos".split(" "));
const number = (value: number | null) => value === null ? "dato no disponible" : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 10 }).format(value);
const status = (value: string | undefined) => value ? ` (${value === "p" ? "provisional" : value})` : "";
const topicWords: Record<string, string> = {
  empleo: "empleo paro desempleo trabajo salario laboral salarios",
  economia: "economia deuda pib deficit deficit crecimiento finanzas",
  fiscalidad: "impuestos fiscalidad iva irpf gasto presupuesto deficit",
  vivienda: "vivienda alquiler casas pisos inmobiliario",
  bienestar: "pobreza desigualdad dependencia pension pensiones bienestar cuidados",
  sanidad: "sanidad salud espera hospital",
  educacion: "educacion escuela becas universidad",
};
function queryTokens(question: string) {
  const words = normalizeMandateText(question).match(/[a-z0-9]+/g) ?? [];
  return [...new Set(words.filter((word) => word.length >= 3 && !STOP.has(word)))];
}
function score(title: string, text: string, topics: string[], tokens: string[]) {
  const name = normalizeMandateText(title), body = normalizeMandateText(text);
  const context = normalizeMandateText(topics.map((topic) => topicWords[topic] ?? topic).join(" "));
  return tokens.reduce((total, token) => total + (name.includes(token) ? 8 : 0) + (body.includes(token) ? 3 : 0) + (context.includes(token) ? 1 : 0), 0);
}
export function findMandateRecords(snapshot: MandateSnapshot, question: string, topic = "") {
  const normalized = normalizeMandateText(question);
  if (/falta|pendiente/.test(normalized) && /revis|contrast/.test(normalized)) {
    return { commitments: snapshot.commitments.filter((item) => item.review.status === "pending" && (!topic || item.topics.includes(topic))).slice(0, 4), indicators: [] };
  }
  const tokens = queryTokens(question);
  const broad = /promes|compromis|balance|mandato/.test(normalizeMandateText(question));
  function select<T extends Commitment | Indicator>(items: T[], take: number): T[] {
    return items.map((item) => {
      const topics = "topics" in item ? item.topics : [item.topic];
      const title = "title" in item ? item.title : item.label;
      const text = "text" in item ? item.text : `${item.explanation} ${item.caveats.join(" ")}`;
      return { item, topics, rank: score(title, text, topics, tokens) };
    }).filter(({ rank, topics }) => (!topic || topics.includes(topic)) && (rank > 0 || (!tokens.length && broad)))
      .sort((a, b) => b.rank - a.rank).slice(0, take).map(({ item }) => item);
  }
  return { commitments: select(snapshot.commitments, 4), indicators: select(snapshot.indicators, 3) };
}
export function answerMandate(snapshot: MandateSnapshot, question: string, topic = ""): MandateAnswer {
  const normalized = normalizeMandateText(question);
  const empty: MandateAnswer = { mode: "no-evidence", paragraphs: [], sources: [], commitmentIds: [], indicatorIds: [], note: "No hay evidencia suficiente en esta selección para responder. La falta de datos no demuestra incumplimiento. Prueba con empleo, vivienda, deuda o pobreza." };
  if (/honest|mentiro|corrupt|a quien.*vot|mejor.*candidato|gan(ar|ara|o).*eleccion/.test(normalized)) {
    return { ...empty, note: "Este piloto no califica la honestidad de una persona ni recomienda el voto. Permite comprobar compromisos concretos y evolución de indicadores. No se ha auditado todo el mandato y una promesa incumplida no demuestra intención de engañar." };
  }
  if (/eleccion/.test(normalized) && /cuando|fecha|dias|noviembre/.test(normalized)) {
    return { ...empty, mode: "documental", paragraphs: [{ text: "El artículo 2 del Real Decreto 806/2026 convoca elecciones al Congreso y al Senado para el 29 de noviembre de 2026.", citations: [snapshot.election.source.id] }], sources: [snapshot.election.source], note: "Fecha de la convocatoria conservada. Esta respuesta no aporta resultados electorales." };
  }
  const { commitments, indicators } = findMandateRecords(snapshot, question, topic);
  if (!commitments.length && !indicators.length) return empty;
  const sources = [...new Map([...commitments.flatMap((item) => item.evidence), ...indicators.map((item) => item.source)].map((item) => [item.id, item])).values()];
  return {
    mode: "documental",
    paragraphs: [
      ...commitments.map((item) => ({
        text: `${item.title}. ${item.review.conclusion} Información del inventario del Gobierno (corte ${item.governmentAssessment.date}): ${item.governmentAssessment.label}.`,
        citations: item.evidence.map((source) => source.id),
      })),
      ...indicators.map((item) => ({
        text: `${item.label}, ${item.geography}: ${number(item.baseline.value)} ${item.unit} en ${item.baseline.period}${status(item.baseline.status)}; ${number(item.latest.value)} ${item.unit} en ${item.latest.period}${status(item.latest.status)}. ${item.explanation} ${item.caveats.join(" ")}`,
        citations: [item.source.id],
      })),
    ],
    sources, commitmentIds: commitments.map((item) => item.id), indicatorIds: indicators.map((item) => item.id),
    note: "Respuesta documental a partir de una selección limitada; no es una auditoría completa ni una generación de IA en directo. Las relaciones son de contexto, no una prueba de causalidad. Cada fuente tiene su fecha de corte."
      + (/falta|pendiente/.test(normalized) && /revis|contrast/.test(normalized) ? ` Hay ${snapshot.commitments.filter((item) => item.review.status === "pending" && (!topic || item.topics.includes(topic))).length} compromisos pendientes de contraste en este ámbito; se muestran hasta cuatro referencias.` : ""),
  };
}

/** The model receives server-owned facts and their caveats, never client-supplied sources. */
export function mandateAnswerStories(answer: MandateAnswer): Story[] {
  return answer.sources.map((source) => ({
    id: source.id, title: source.title, url: source.url, sourceId: source.id,
    source: source.producer, kind: "oficial", author: null, publishedAt: source.publishedAt,
    excerpt: [source.excerpt, `Localizador: ${source.locator}.`].join(" ").slice(0, 2500),
    editorialContext: ["Contexto elaborado por RegTrack a partir de varias referencias; no es contenido literal ni una afirmación de este documento por sí solo.", ...answer.paragraphs.filter((paragraph) => paragraph.citations.includes(source.id)).map((paragraph) => paragraph.text), answer.note].join(" ").slice(0, 6000),
    topics: [], territories: [], national: true,
  }));
}

/** Keep whole cited paragraphs, prioritizing the measured series over broad context. */
export function boundMandateAnswer(answer: MandateAnswer, maxSources = 8): MandateAnswer {
  const selected = new Set<string>();
  const paragraphs: MandateAnswer["paragraphs"] = [];
  const ranked = [...answer.paragraphs].sort((a, b) => Number(b.citations.some((id) => id.startsWith("indicator-"))) - Number(a.citations.some((id) => id.startsWith("indicator-"))));
  for (const paragraph of ranked) {
    const additional = paragraph.citations.filter((id) => !selected.has(id));
    if (selected.size + additional.length > maxSources) continue;
    paragraph.citations.forEach((id) => selected.add(id));
    paragraphs.push(paragraph);
  }
  return { ...answer, paragraphs, sources: answer.sources.filter((source) => selected.has(source.id)),
    indicatorIds: answer.indicatorIds.filter((id) => selected.has(`indicator-${id}`)),
    commitmentIds: answer.commitmentIds.filter((id) => selected.has(`${id}-commitment`)),
  };
}
