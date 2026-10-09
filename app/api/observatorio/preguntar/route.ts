import { requireAdmin, rejectForeignOrigin } from "@/lib/auth";
import { loadBulletin } from "@/lib/observatorio/feed";
import {
  filterStories,
  searchStories,
  DEFAULT_FILTERS,
  TOPICS,
} from "@/lib/observatorio/model";
import { synthesize } from "@/lib/observatorio/answer";
export const runtime = "nodejs";
export const maxDuration = 60;
// Pilot brake per process. Provider budget is also required before activation;
// this is deliberately not advertised as a distributed spending limit.
const lastQuestion = new Map<string, number>();
export async function POST(request: Request) {
  if (process.env.OBSERVATORY_AI_ENABLED !== "true")
    return Response.json(
      { mode: "documental" },
      { headers: { "Cache-Control": "no-store" } },
    );
  const foreign = rejectForeignOrigin(request);
  if (foreign) return foreign;
  const { user, error } = await requireAdmin();
  if (error) return error;
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json(
      { error: "La redacción con IA aún no está configurada." },
      { status: 503 },
    );
  const now = Date.now();
  for (const [id, time] of lastQuestion)
    if (now - time > 60000) lastQuestion.delete(id);
  if (lastQuestion.has(user.usuarioId))
    return Response.json(
      { error: "Espera un minuto antes de pedir otra explicación." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  let input: Record<string, unknown>;
  try {
    if (Number(request.headers.get("content-length")) > 4096) throw Error();
    const reader = request.body?.getReader();
    if (!reader) throw Error();
    let bytes = 0,
      body = "";
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 4096) throw Error();
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      await reader.cancel();
    }
    input = JSON.parse(body);
    if (!input || Array.isArray(input)) throw Error();
  } catch {
    return Response.json({ error: "Consulta no válida." }, { status: 400 });
  }
  if (
    typeof input.question !== "string" ||
    input.question.trim().length < 3 ||
    input.question.length > 500
  )
    return Response.json(
      { error: "Escribe una pregunta de entre 3 y 500 caracteres." },
      { status: 400 },
    );
  const f =
    input.filters && typeof input.filters === "object"
      ? (input.filters as Record<string, unknown>)
      : {};
  const filters = {
    ...DEFAULT_FILTERS,
    territory:
      typeof f.territory === "string" &&
      /^(?:r-\d{2}|p-\d{2}|m-\d{5})$/.test(f.territory)
        ? f.territory
        : "",
    topic:
      typeof f.topic === "string" && TOPICS.some((t) => t.id === f.topic)
        ? f.topic
        : "",
    kind:
      typeof f.kind === "string" &&
      ["oficial", "noticia", "analisis"].includes(f.kind)
        ? f.kind
        : "",
    source: typeof f.source === "string" ? f.source.slice(0, 40) : "",
    days:
      typeof f.days === "number" && [0, 1, 7, 30].includes(f.days) ? f.days : 7,
    includeNational: f.includeNational === true,
  };
  lastQuestion.set(user.usuarioId, now);
  try {
    const bulletin = await loadBulletin();
    const sources = searchStories(
      filterStories(bulletin.stories, filters),
      input.question,
    );
    if (!sources.length)
      return Response.json({ mode: "documental", sources: [] });
    const paragraphs = await synthesize(input.question, sources);
    return Response.json(
      { mode: "ia", paragraphs, sources },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "No se pudo redactar una explicación verificable. Consulta las referencias documentales.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
