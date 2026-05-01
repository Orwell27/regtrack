// lib/sectorial/clasificar.ts
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createServerClient } from '@/lib/supabase'

export interface ClasificacionSectorial {
  subcategoria_id: number
  subcategoria_slug: string
  confianza: number
}

function extractJsonArray(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (stripped.startsWith('[')) return stripped
  const match = stripped.match(/\[[\s\S]*\]/)
  if (match) return match[0]
  return '[]'
}

export async function clasificarSectorial(
  alertaId: string,
  titulo: string,
  resumen: string | null
): Promise<ClasificacionSectorial[]> {
  const db = createServerClient()

  const { data: subcats } = await db
    .from('subcategorias')
    .select('id, slug')
    .eq('activo', true)

  if (!subcats || subcats.length === 0) return []

  const slugsList = subcats.map(s => s.slug).join(', ')
  const systemPrompt = readFileSync(join(process.cwd(), 'prompts', 'regtrack-sectorial.md'), 'utf-8')
  const userContent = `Subcategorías disponibles: ${slugsList}\n\nTítulo: ${titulo}\n\nResumen: ${resumen ?? '(sin resumen)'}`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(extractJsonArray(text)) as Array<{
      subcategoria_slug: string
      confianza: number
    }>

    const slugToId = new Map(subcats.map(s => [s.slug, s.id]))
    const validSlugs = new Set(subcats.map(s => s.slug))

    const clasificaciones: ClasificacionSectorial[] = parsed
      .filter(r => r.confianza >= 60 && validSlugs.has(r.subcategoria_slug))
      .map(r => ({
        subcategoria_id: slugToId.get(r.subcategoria_slug)!,
        subcategoria_slug: r.subcategoria_slug,
        confianza: Math.round(r.confianza),
      }))

    if (clasificaciones.length > 0) {
      await db.from('alerta_sectores').insert(
        clasificaciones.map(c => ({
          alerta_id: alertaId,
          subcategoria_id: c.subcategoria_id,
          confianza: c.confianza,
        }))
      )
      console.log(`[sectorial] ${clasificaciones.length} subcategorías para alerta ${alertaId}: ${clasificaciones.map(c => c.subcategoria_slug).join(', ')}`)
    }

    return clasificaciones
  } catch (err) {
    console.error('[sectorial] Error en clasificación:', err)
    return []
  }
}
