import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { buildAlertaContext } from '@/lib/asistente'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return new Response('No autorizado', { status: 401 })
  if (user.plan !== 'pro') return new Response('Solo disponible para suscriptores Pro', { status: 403 })

  const { id } = await params

  let pregunta: string
  try {
    const body = await req.json()
    pregunta = body?.pregunta?.trim() ?? ''
  } catch {
    return new Response('Cuerpo inválido', { status: 400 })
  }
  if (!pregunta) return new Response('Pregunta requerida', { status: 400 })

  const db = createNextServerClient()
  const { data: alerta } = await db
    .from('alertas')
    .select(
      'titulo, resumen, impacto, accion_recomendada, afectados, territorios, plazo_adaptacion, deroga_modifica, subtema, tipo_norma, fecha_entrada_vigor'
    )
    .eq('id', id)
    .eq('estado', 'enviada')
    .single()

  if (!alerta) return new Response('Alerta no encontrada', { status: 404 })

  const contexto = buildAlertaContext(alerta)
  const systemPrompt = readFileSync(join(process.cwd(), 'prompts', 'regtrack-asistente.md'), 'utf-8')
  const systemWithContext = `${systemPrompt}\n\n---\n\n## ALERTA NORMATIVA\n\n${contexto}`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemWithContext,
          messages: [{ role: 'user', content: pregunta }],
        })
        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
