import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Subtema, Ambito, Urgencia, TipoNorma } from './supabase'

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function loadPrompt(filename: string): string {
  return readFileSync(join(process.cwd(), 'prompts', filename), 'utf-8')
}

// ─── Clasificador ────────────────────────────────────────────────────────────

export interface ClassifyResult {
  relevante: boolean
  subtema: Subtema
  ambito_territorial: Ambito
  motivo: string
}

export async function classifyDocument(
  titulo: string,
  texto: string
): Promise<ClassifyResult> {
  try {
    const systemPrompt = loadPrompt('regtrack-clasificador.md')
    const userContent = `Título: ${titulo}\n\nTexto:\n${texto.slice(0, 3000)}`
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 384,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return JSON.parse(text) as ClassifyResult
  } catch (err) {
    console.error('classifyDocument error:', err)
    return { relevante: false, subtema: 'otro', ambito_territorial: 'estatal', motivo: 'Error de clasificación' }
  }
}

// ─── Análisis de impacto ─────────────────────────────────────────────────────

export interface ImpactResult {
  resumen: string
  impacto: string
  afectados: string[]
  urgencia: Urgencia
  tipo_norma: TipoNorma
  fecha_publicacion: string
  fecha_entrada_vigor: string | null
  plazo_adaptacion: number | null
  deroga_modifica: string | null
  territorios: string[]
  accion_recomendada: string
  score_relevancia: number
}

export async function analyzeImpact(
  titulo: string,
  texto: string,
  fuente: string
): Promise<ImpactResult | null> {
  try {
    const systemPrompt = loadPrompt('regtrack-impacto.md')
    const userContent = `Fuente: ${fuente}\nTítulo: ${titulo}\n\nTexto completo:\n${texto.slice(0, 8000)}`
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return JSON.parse(text) as ImpactResult
  } catch (err) {
    console.error('analyzeImpact error:', err)
    return null
  }
}
