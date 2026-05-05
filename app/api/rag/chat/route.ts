import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '@/lib/auth'
import { generateEmbedding } from '@/lib/embeddings'
import { createServerClient } from '@/lib/supabase'

const SYSTEM_PROMPT = `Eres el asistente de RegTrack, especializado en normativa inmobiliaria española.
Responde SOLO con información de las alertas normativas proporcionadas como contexto.
Cita siempre la fuente (BOE, BOCM, DOGC…) y la fecha de publicación cuando estén disponibles.
Si no tienes información suficiente en el contexto, dilo claramente sin inventar datos.
Responde siempre en español. Sé conciso y directo. Usa negritas para términos clave.`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AlertaResult {
  id: string
  titulo: string
  resumen: string
  fuente: string
  subtema: string
  ambito: string
  score_relevancia: number
  urgencia: string
  territorios: unknown
  created_at: string
  similarity: number
}

function buildContext(alertas: AlertaResult[]): string {
  if (alertas.length === 0) {
    return 'No hay alertas normativas relevantes para esta consulta en la base de datos.'
  }
  return alertas
    .map((a, i) => {
      const fecha = new Date(a.created_at).toLocaleDateString('es-ES')
      return `[${i + 1}] ${a.fuente} — ${a.titulo} (${fecha})\n${a.resumen}`
    })
    .join('\n\n')
}

export async function POST(request: Request) {
  // 1. Autenticación
  const user = await getAuthUser()
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Parsear y validar body
  let body: { query?: unknown; history?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { query, history } = body

  if (typeof query !== 'string' || query.trim().length === 0) {
    return Response.json({ error: 'El campo query es obligatorio' }, { status: 400 })
  }
  if (!Array.isArray(history)) {
    return Response.json({ error: 'El campo history debe ser un array' }, { status: 400 })
  }

  // Limitar historial a 6 turnos (12 mensajes)
  const trimmedHistory = (history as Message[]).slice(-12)

  // 3. Embed query + recuperar alertas relevantes
  let embedding: number[]
  try {
    embedding = await generateEmbedding(query)
  } catch {
    return Response.json({ error: 'Error al procesar la consulta. Inténtalo de nuevo.' }, { status: 503 })
  }

  const db = createServerClient()
  const { data: alertas, error: dbError } = await db.rpc('match_alertas', {
    query_embedding: embedding,
    match_count: 6,
  }) as { data: AlertaResult[] | null; error: unknown }

  if (dbError) {
    return Response.json({ error: 'Error al buscar normativa' }, { status: 500 })
  }

  const matchedAlertas = alertas ?? []
  const context = buildContext(matchedAlertas)
  const systemWithContext = `${SYSTEM_PROMPT}\n\n## Alertas normativas de contexto\n\n${context}`

  // 4. Streaming SSE con Claude Haiku
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const claudeStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5',
          max_tokens: 600,
          system: systemWithContext,
          messages: [
            ...trimmedHistory,
            { role: 'user', content: query },
          ],
        })

        for await (const chunk of claudeStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const event = JSON.stringify({ type: 'text', text: chunk.delta.text })
            controller.enqueue(encoder.encode(`data: ${event}\n\n`))
          }
        }

        // Evento final con fuentes
        const sourcesEvent = JSON.stringify({
          type: 'sources',
          sources: matchedAlertas.map(a => ({
            id: a.id,
            titulo: a.titulo,
            fuente: a.fuente,
            similarity: a.similarity,
          })),
        })
        controller.enqueue(encoder.encode(`data: ${sourcesEvent}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch {
        const errorEvent = JSON.stringify({ type: 'error', message: 'Error al generar respuesta' })
        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
