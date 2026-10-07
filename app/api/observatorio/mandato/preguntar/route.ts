import { requireAdmin, rejectForeignOrigin } from "@/lib/auth";
import { getMandateSnapshot } from "@/lib/mandate/data";
import { answerMandate, boundMandateAnswer, mandateAnswerStories } from "@/lib/mandate/answer";
import { synthesize } from "@/lib/observatorio/answer";

export const runtime = "nodejs";
export const maxDuration = 60;
const lastQuestion = new Map<string, number>();
const headers = { "Cache-Control": "private, no-store" };
function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers });
}
async function readInput(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw Error();
  if (Number(request.headers.get("content-length")) > 4096) throw Error();
  const reader = request.body?.getReader();
  if (!reader) throw Error();
  let size = 0, body = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) throw Error();
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally { await reader.cancel(); }
  const input = JSON.parse(body);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error();
  return input;
}
export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try { input = await readInput(request); } catch { return error("Consulta no válida o demasiado larga.", 400); }
  if (typeof input.question !== "string" || input.question.trim().length < 3 || input.question.length > 500)
    return error("Escribe una pregunta de entre 3 y 500 caracteres.", 400);
  if (input.mode !== undefined && input.mode !== "ia" && input.mode !== "documental") return error("Modo de consulta no válido.", 400);
  if (input.topic !== undefined && (typeof input.topic !== "string" || input.topic.length > 40)) return error("Tema no válido.", 400);
  const question = input.question.trim();
  let answer;
  try { answer = answerMandate(getMandateSnapshot(), question, typeof input.topic === "string" ? input.topic : ""); }
  catch { return error("El archivo documental no está disponible. No se ha generado una respuesta.", 503); }
  if (input.mode !== "ia" || answer.mode === "no-evidence" || !answer.sources.length) return Response.json(answer, { headers });
  if (process.env.MANDATE_AI_ENABLED !== "true" || process.env.OBSERVATORY_AI_ENABLED !== "true") {
    return Response.json({ ...answer, note: `${answer.note} La IA en directo no está activada; puedes leer las interpretaciones preparadas y sus referencias.` }, { headers });
  }
  const foreign = rejectForeignOrigin(request);
  if (foreign) return foreign;
  const { user, error: authError } = await requireAdmin();
  if (authError) return authError;
  if (!process.env.ANTHROPIC_API_KEY) return error("La redacción con IA aún no está configurada.", 503);
  const now = Date.now();
  for (const [id, time] of lastQuestion) if (now - time >= 60000) lastQuestion.delete(id);
  if (lastQuestion.has(user.usuarioId)) return Response.json({ error: "Espera un minuto antes de pedir otra explicación." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  // Per-process pilot brake, not a distributed quota. Provider budget must precede activation.
  lastQuestion.set(user.usuarioId, now);
  try {
    const boundedAnswer = boundMandateAnswer(answer);
    const sources = boundedAnswer.sources;
    const paragraphs = await synthesize(question, mandateAnswerStories(boundedAnswer), "mandate");
    // Preserve computed archive summaries verbatim and without attributing them to an external document.
    const computed = boundedAnswer.paragraphs.filter((paragraph) => !paragraph.citations.length);
    return Response.json({ ...boundedAnswer, mode: "ia", sources, paragraphs: [...computed, ...paragraphs.map((paragraph) => ({ text: paragraph.text, citations: paragraph.citations.map((number) => sources[number - 1].id) }))], note: `${computed.length ? `${answer.note} ` : ""}Interpretación de IA de las referencias seleccionadas. Las citas se validan por identificador; eso no constituye verificación automática de cada afirmación. Consulta los originales. No atribuye causalidad ni evalúa todo el mandato.` }, { headers });
  } catch { return Response.json({ ...answer, note: `${answer.note} La redacción de IA no ha podido completarse; se conserva la respuesta documental.` }, { headers }); }
}
