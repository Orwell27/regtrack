import Anthropic, { APIError } from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Subtema, Ambito, Urgencia, TipoNorma } from './supabase'
import { MAX_DOCUMENT_CHARS } from './sources/http'

export class AnalysisError extends Error {}

function inputText(text: string): string {
  if (typeof text !== 'string' || text.length > MAX_DOCUMENT_CHARS) throw new AnalysisError('Texto inválido o demasiado largo; requiere recuperación o análisis por partes')
  return text
}

function extractJson(text: string): string {
  // 1. Quitar bloques ```json ... ```
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  // 2. Si ya es JSON válido, devolver tal cual
  if (stripped.startsWith('{')) return stripped
  // 3. Extraer el primer objeto JSON que aparezca en el texto
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) return match[0]
  return stripped
}

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function loadPrompt(filename: string): string {
  return readFileSync(join(process.cwd(), 'prompts', filename), 'utf-8')
}

export interface MetaBOE {
  departamento?: string
  epigrafe?: string
  rango?: string
}

function buildMetaHeader(meta?: MetaBOE): string {
  if (!meta) return ''
  const lines = [
    meta.departamento ? `Departamento: ${meta.departamento}` : '',
    meta.epigrafe ? `Epígrafe oficial BOE: ${meta.epigrafe}` : '',
    meta.rango ? `Rango oficial: ${meta.rango}` : '',
  ].filter(Boolean)
  return lines.length > 0 ? lines.join('\n') + '\n\n' : ''
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
  texto: string,
  meta?: MetaBOE
): Promise<ClassifyResult> {
  try {
    const systemPrompt = loadPrompt('regtrack-clasificador.md')
    const userContent = `${buildMetaHeader(meta)}Título: ${titulo}\n\nTexto:\n${inputText(texto)}`
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 384,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result = JSON.parse(extractJson(text)) as ClassifyResult
    if (response.stop_reason === 'max_tokens' || typeof result.relevante !== 'boolean' || typeof result.motivo !== 'string' || typeof result.subtema !== 'string' || typeof result.ambito_territorial !== 'string') {
      throw new AnalysisError('Clasificación incompleta o con estructura inválida')
    }
    return result
  } catch (err) {
    // Un fallo de la API (sin saldo, clave, caída) no significa que el documento sea irrelevante
    if (err instanceof APIError) throw err
    console.error('classifyDocument error:', err)
    throw new AnalysisError('No se pudo interpretar la clasificación; documento pendiente de reintento', { cause: err })
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
  fuente: string,
  meta?: MetaBOE
): Promise<ImpactResult | null> {
  try {
    const systemPrompt = loadPrompt('regtrack-impacto.md')
    const userContent = `${buildMetaHeader(meta)}Fuente: ${fuente}\nTítulo: ${titulo}\n\nTexto disponible:\n${inputText(texto)}`
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      // Con 1024 las normas largas (p. ej. el RDL 26/2026) cortaban el JSON a medias
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    if (response.stop_reason === 'max_tokens') {
      console.error(`analyzeImpact: respuesta cortada por max_tokens en "${titulo.slice(0, 60)}"`)
      return null
    }

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const result = JSON.parse(extractJson(text)) as ImpactResult
    if (!Number.isFinite(result.score_relevancia) || result.score_relevancia < 1 || result.score_relevancia > 10 || typeof result.resumen !== 'string' || typeof result.impacto !== 'string' || !Array.isArray(result.afectados) || !Array.isArray(result.territorios) || typeof result.accion_recomendada !== 'string') {
      throw new AnalysisError('Análisis de impacto con estructura inválida')
    }
    return result
  } catch (err) {
    if (err instanceof APIError) throw err
    console.error('analyzeImpact error:', err)
    return null
  }
}
