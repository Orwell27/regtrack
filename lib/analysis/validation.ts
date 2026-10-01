import type { TipoNorma, Urgencia } from '../supabase'

export class AnalysisError extends Error {}
export class ReviewRequiredError extends Error {}
export interface AnalysisContext {
  departamento?: string
  epigrafe?: string
  rango?: string
  fecha_publicacion?: string
  contenido?: 'texto_completo' | 'sumario'
}
export interface Citation { cita: string; localizador: string }
export interface SupportedDate { fecha: string | null; regla: string | null; cita: string | null; localizador: string | null }
export interface Adaptation extends Citation { cantidad: number; unidad: 'dias' | 'dias_habiles' | 'meses' | 'años'; inicio: string; destinatarios: string }
export interface SupportedAction extends Citation { accion: string }
export interface ImpactResult {
  resumen: string; impacto: string; afectados: string[]; urgencia: Urgencia
  tipo_norma: TipoNorma | null; rango: string | null
  fecha_publicacion: string | null; fecha_entrada_vigor: string | null; plazo_adaptacion: number | null
  deroga_modifica: string | null; territorios: string[]; accion_recomendada: string; score_relevancia: number
  entrada_vigor: SupportedDate; efectos: SupportedDate[]; plazos_adaptacion: Adaptation[]
  acciones: SupportedAction[]; evidencias: (Citation & { campo: string })[]; limitaciones: string[]
}
const space = (value: string) => value.replace(/\s+/g, ' ').trim()
const fold = (value: string) => space(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const words = (value: string) => fold(value).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

export function requireSubstantiveText(title: string, text: string, context?: AnalysisContext) {
  const body = words(text)
  const heading = words(title)
  if (context?.contenido === 'sumario' || !body || body === heading || (heading && body.replaceAll(heading, '').trim() === '')) {
    throw new ReviewRequiredError('Texto insuficiente: solo título/sumario; requiere texto completo o revisión')
  }
}
export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
const normTypes: TipoNorma[] = ['Ley Orgánica', 'Ley', 'Real Decreto-ley', 'Real Decreto', 'Orden Ministerial', 'Resolución', 'Circular', 'Anuncio']
/** No falsear el catálogo heredado: Decreto se conserva en rango y tipo_norma queda null. */
export function documentRange(title: string, official?: string): { rango: string | null; tipo_norma: TipoNorma | null } {
  const titleRange = /^(Real Decreto-ley|Real Decreto|Ley Orgánica|Ley|Decreto-ley|Decreto legislativo|Decreto|Orden Ministerial|Orden|Resolución|Circular|Anuncio|Acuerdo)\b/i.exec(title.trim())?.[1]
  const rango = official?.trim() || titleRange || null
  return { rango, tipo_norma: normTypes.find(value => rango && fold(value) === fold(rango)) ?? null }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AnalysisError('Objeto de análisis inválido')
  return value as Record<string, unknown>
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new AnalysisError('Campo de texto vacío o inválido')
  return value.trim()
}
function optionalText(value: unknown): string | null { return value === null ? null : text(value) }
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new AnalysisError('Campo de lista inválido')
  return value
}
function citation(value: Record<string, unknown>, source: string): Citation {
  const cita = text(value.cita)
  if (space(cita).length < 20 || !space(source).includes(space(cita))) throw new ReviewRequiredError('Cita sin respaldo literal suficiente en el documento; requiere revisión')
  return { cita, localizador: text(value.localizador) }
}
function literalDates(quote: string): string[] {
  const dates = [...quote.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(match => match[0])
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  for (const match of fold(quote).matchAll(/\b(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\b/g)) {
    const month = months.indexOf(match[2] === 'setiembre' ? 'septiembre' : match[2]) + 1
    if (month) dates.push(`${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`)
  }
  return dates.filter(isISODate)
}
function supportedDate(value: unknown, source: string, isEntry: boolean): SupportedDate {
  const row = object(value)
  const fecha = optionalText(row.fecha)
  const regla = optionalText(row.regla)
  if (!fecha && !regla) {
    if (row.cita !== null || row.localizador !== null) throw new AnalysisError('Fecha desconocida con evidencia incoherente')
    return { fecha: null, regla: null, cita: null, localizador: null }
  }
  const evidence = citation(row, source)
  if (isEntry && !/en\s+vigor/i.test(evidence.cita)) throw new ReviewRequiredError('La cita no identifica entrada en vigor; no confundirla con efectos')
  const dates = [...new Set(literalDates(evidence.cita))]
  if (fecha && (!isISODate(fecha) || dates.length !== 1 || dates[0] !== fecha)) throw new ReviewRequiredError('Fecha no literal o cita con varias fechas: acotar la evidencia, conservar regla relativa y revisar el cómputo')
  return { fecha, regla, ...evidence }
}
const numberWords: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, treinta: 30, sesenta: 60, noventa: 90 }
function periodInQuote(quote: string, quantity: number, unit: string): boolean {
  const normalized = fold(quote)
  for (const match of normalized.matchAll(/\b(\d+|\p{L}+)\s+(dias?(?:\s+habiles)?|mes(?:es)?|anos?)\b/gu)) {
    // No aceptar la cola de un numeral compuesto, decimal o con separador de miles.
    const prefix = normalized.slice(0, match.index)
    if (/(?:\b(?:y|ciento|\p{L}*cientos|mil|millon|millones)\s+|\d[.,]\s*)$/u.test(prefix)) continue
    const amount = /^\d+$/.test(match[1]) ? Number(match[1]) : numberWords[match[1]]
    const foundUnit = match[2].includes('habiles') ? 'dias_habiles' : match[2].startsWith('dia') ? 'dias' : match[2].startsWith('mes') ? 'meses' : 'años'
    if (amount === quantity && unit === foundUnit) return true
  }
  return false
}

/** Verifica estructura y presencia de citas. No demuestra que una cita implique la interpretación. */
export function normalizeImpact(raw: unknown, title: string, source: string, context?: AnalysisContext): ImpactResult {
  const row = object(raw)
  if (row.estado_analisis === 'requiere_revision') throw new ReviewRequiredError(text(row.motivo_revision))
  if (row.estado_analisis !== 'suficiente') throw new AnalysisError('Falta estado explícito de suficiencia')
  const resumen = text(row.resumen)
  const impact = text(row.impacto)
  const urgency = row.urgencia
  if (!['alta', 'media', 'baja'].includes(String(urgency))) throw new AnalysisError('Urgencia inválida')
  if (typeof row.score_relevancia !== 'number' || !Number.isInteger(row.score_relevancia) || row.score_relevancia < 1 || row.score_relevancia > 10) throw new AnalysisError('Puntuación inválida')
  if (context?.fecha_publicacion !== undefined && !isISODate(context.fecha_publicacion)) throw new AnalysisError('Fecha oficial de publicación inválida')
  const entrada_vigor = supportedDate(row.entrada_vigor, source, true)
  const efectos = list(row.efectos).map(value => supportedDate(value, source, false))
  const plazos_adaptacion = list(row.plazos_adaptacion).map(value => {
    const period = object(value)
    if (typeof period.cantidad !== 'number' || !Number.isInteger(period.cantidad) || period.cantidad < 1 || !['dias', 'dias_habiles', 'meses', 'años'].includes(String(period.unidad))) throw new AnalysisError('Cantidad/unidad de adaptación inválida; no se aceptan números como cadenas')
    const evidence = citation(period, source)
    if (/entrar[aá]n?\s+en\s+vigor/i.test(evidence.cita) || !periodInQuote(evidence.cita, period.cantidad, String(period.unidad))) throw new ReviewRequiredError('Plazo de adaptación sin respaldo de cantidad/unidad, o confundido con entrada en vigor')
    return { cantidad: period.cantidad, unidad: period.unidad as Adaptation['unidad'], inicio: text(period.inicio), destinatarios: text(period.destinatarios), ...evidence }
  })
  const acciones = list(row.acciones).map(value => {
    const action = object(value)
    return { accion: text(action.accion), ...citation(action, source) }
  })
  if (!acciones.length) throw new ReviewRequiredError('Sin acciones respaldadas; requiere revisión')
  const evidencias = list(row.evidencias).map(value => {
    const item = object(value)
    return { campo: text(item.campo), ...citation(item, source) }
  })
  for (const field of ['resumen', 'impacto', ...(row.deroga_modifica !== null ? ['deroga_modifica'] : [])]) {
    if (!evidencias.some(item => item.campo === field)) throw new ReviewRequiredError(`Falta respaldo del campo ${field}`)
  }
  const limitaciones = list(row.limitaciones).map(text)
  limitaciones.push('Análisis del texto aportado; vigencia actual pendiente de verificación.')
  const printableCitation = (item: Citation) => `${item.localizador}: «${space(item.cita)}»`
  const dateDescription = (label: string, date: SupportedDate) => date.cita ? `${label}: ${date.fecha ?? date.regla}. ${printableCitation(date as Citation)}` : `${label}: no determinada en el texto.`
  const periodDescription = plazos_adaptacion.map(item => `Adaptación: ${item.cantidad} ${item.unidad === 'dias_habiles' ? 'días hábiles' : item.unidad === 'dias' ? 'días' : item.unidad}; desde ${item.inicio}; para ${item.destinatarios}. ${printableCitation(item)}`)
  const details = [dateDescription('Entrada en vigor', entrada_vigor), ...efectos.map(item => dateDescription('Efectos', item)), ...periodDescription, ...limitaciones]
  return {
    resumen, impacto: [impact, ...details].join('\n\n'), afectados: list(row.afectados).map(text), urgencia: urgency as Urgencia,
    ...documentRange(title, context?.rango), fecha_publicacion: context?.fecha_publicacion ?? null,
    fecha_entrada_vigor: entrada_vigor.fecha,
    // Campo heredado INTEGER: conservar solo un plazo expresado en días. Nunca meses*30.
    plazo_adaptacion: plazos_adaptacion.length === 1 && plazos_adaptacion[0].unidad === 'dias' ? plazos_adaptacion[0].cantidad : null,
    deroga_modifica: optionalText(row.deroga_modifica), territorios: list(row.territorios).map(text),
    accion_recomendada: acciones.map((action, index) => `${index + 1}) ${action.accion}\n${printableCitation(action)}`).join('\n\n'),
    score_relevancia: row.score_relevancia, entrada_vigor, efectos, plazos_adaptacion, acciones, evidencias, limitaciones,
  }
}
