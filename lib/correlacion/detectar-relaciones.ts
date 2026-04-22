// lib/correlacion/detectar-relaciones.ts
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createServerClient } from '@/lib/supabase'
import { getSubtemasGrupo } from './subtema-grupos'
import type { RelacionDetectada } from './types'
import type { Subtema } from '@/lib/supabase'


interface AlertaMinima {
  id: string
  titulo: string
  subtema: Subtema | null
  territorios: string[]
  resumen: string | null
}

interface CandidatoSQL {
  id: string
  titulo: string
  subtema: string
  territorios: string[]
  tipo_norma: string | null
  fecha_publicacion: string | null
  resumen: string | null
}

function extractJson(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (stripped.startsWith('{')) return stripped
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) return match[0]
  return stripped
}

export async function detectarRelaciones(alerta: AlertaMinima): Promise<RelacionDetectada[]> {
  if (!alerta.subtema) return []

  const db = createServerClient()
  const subtemasGrupo = getSubtemasGrupo(alerta.subtema)

  // Build query: same thematic group, overlapping territories, last 2 years, not self
  const fechaLimite = new Date()
  fechaLimite.setFullYear(fechaLimite.getFullYear() - 2)

  let query = db
    .from('alertas')
    .select('id, titulo, subtema, territorios, tipo_norma, fecha_publicacion, resumen')
    .in('subtema', subtemasGrupo)

  // Only apply territory overlap filter if alert has territories
  if (alerta.territorios.length > 0) {
    query = query.overlaps('territorios', alerta.territorios)
  }

  query = query
    .gte('fecha_publicacion', fechaLimite.toISOString().split('T')[0])
    .neq('id', alerta.id)
    .order('fecha_publicacion', { ascending: false })
    .limit(10)

  const { data: candidatos, error } = await query as { data: CandidatoSQL[] | null; error: unknown }

  if (error || !candidatos || candidatos.length === 0) return []

  // Call Haiku
  try {
    const systemPrompt = readFileSync(join(process.cwd(), 'prompts', 'regtrack-correlacion.md'), 'utf-8')
    const lista = candidatos
      .map((c, i) => `${i + 1}. [ID: ${c.id}] ${c.titulo} (${c.subtema}, ${c.fecha_publicacion ?? 'sin fecha'}, ${c.tipo_norma ?? 'tipo desconocido'})\n   Resumen: ${(c.resumen ?? '').slice(0, 200)}`)
      .join('\n\n')

    const userContent = `NUEVA NORMA:
- Título: ${alerta.titulo}
- Subtema: ${alerta.subtema}
- Territorios: ${alerta.territorios.join(', ') || 'Nacional'}
- Resumen: ${(alerta.resumen ?? '').slice(0, 300)}

NORMAS EXISTENTES:
${lista}`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(extractJson(text)) as {
      relaciones: Array<{ id: string; tipo: string; score: number; razon: string }>
    }

    const candidatoIds = new Set(candidatos.map(c => c.id))
    const tiposValidos = new Set(['progresion', 'deroga', 'modifica', 'complementa'])

    return parsed.relaciones
      .filter(r => r.score >= 40 && candidatoIds.has(r.id) && tiposValidos.has(r.tipo))
      .map(r => ({
        alerta_relacionada_id: r.id,
        tipo_relacion: r.tipo as RelacionDetectada['tipo_relacion'],
        score_similitud: Math.round(r.score),
        razon: r.razon ?? null,
      }))
  } catch (err) {
    console.error('[correlacion] Error en Haiku:', err)
    return []
  }
}
