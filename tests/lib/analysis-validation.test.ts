import { describe, expect, it } from 'vitest'
import { AnalysisError, ReviewRequiredError, documentRange, normalizeImpact, requireSubstantiveText } from '@/lib/analysis/validation'
import { documentText, entryQuote, impactResponse } from '../fixtures/impact-response'
import { hydrateDocument } from '@/lib/pipeline/sources'
import type { NormalizedItem } from '@/lib/sources/boe'

describe('fechas, unidades y respaldo del contrato de análisis', () => {
  it('conserva una regla relativa sin calcular una fecha absoluta desde la publicación', () => {
    const result = normalizeImpact(impactResponse(), 'Decreto 256/2019', documentText, { fecha_publicacion: '2019-10-19' })
    expect(result.fecha_entrada_vigor).toBeNull()
    expect(result.entrada_vigor.regla).toContain('Veinte días')
    expect(result.fecha_publicacion).toBe('2019-10-19')
  })
  it('rechaza la fecha derivada que antes daba el modelo aunque el cálculo pareciera correcto', () => {
    const raw = impactResponse()
    expect(() => normalizeImpact({ ...raw, entrada_vigor: { ...raw.entrada_vigor, fecha: '2019-11-08' } }, 'Decreto', documentText)).toThrow(ReviewRequiredError)
  })
  it('conserva entrada literal y efectos en fechas distintas', () => {
    const entry = 'Este real decreto entrará en vigor el día 2 de enero de 2025.'
    const effects = 'Las disposiciones desplegarán efectos el día 1 de julio de 2025.'
    const result = normalizeImpact({ ...impactResponse(), entrada_vigor: { fecha: '2025-01-02', regla: null, cita: entry, localizador: 'DF cuarta' }, efectos: [{ fecha: '2025-07-01', regla: null, cita: effects, localizador: 'DF cuarta' }] }, 'Real Decreto 1312/2024', documentText + '\n' + entry + '\n' + effects)
    expect(result.fecha_entrada_vigor).toBe('2025-01-02')
    expect(result.efectos[0].fecha).toBe('2025-07-01')
    expect(result.impacto).toContain('Efectos: 2025-07-01')
  })
  it('no acepta una cita de efectos como entrada en vigor', () => {
    const quote = 'Esta resolución surtirá efectos a partir del 1 de enero de 2025.'
    const raw = { ...impactResponse(), entrada_vigor: { fecha: '2025-01-01', regla: null, cita: quote, localizador: 'Tercero' } }
    expect(() => normalizeImpact(raw, 'Resolución', documentText + quote)).toThrow(/efectos/)
  })
  it('no permite transformar en adaptación el plazo de entrada en vigor', () => {
    const raw = impactResponse()
    expect(() => normalizeImpact({ ...raw, plazos_adaptacion: [{ ...raw.plazos_adaptacion[0], cantidad: 20, unidad: 'dias', cita: entryQuote }] }, 'Decreto', documentText)).toThrow(/confundido/)
  })
  it('cantidad y unidad deben estar expresas en la cita: no acepta 180 días por seis meses', () => {
    const raw = impactResponse()
    expect(() => normalizeImpact({ ...raw, plazos_adaptacion: [{ ...raw.plazos_adaptacion[0], cantidad: 180, unidad: 'dias' }] }, 'Decreto', documentText)).toThrow(ReviewRequiredError)
  })
  it('distingue días hábiles y no los persiste como días sin unidad', () => {
    const raw = impactResponse()
    const quote = 'Los alojamientos existentes deberán adaptarse en un plazo de diez días hábiles.'
    const period = { ...raw.plazos_adaptacion[0], cantidad: 10, unidad: 'dias_habiles', cita: quote }
    const result = normalizeImpact({ ...raw, plazos_adaptacion: [period] }, 'Decreto', documentText + quote)
    expect(result.plazo_adaptacion).toBeNull()
    expect(result.impacto).toContain('10 días hábiles')
    expect(() => normalizeImpact({ ...raw, plazos_adaptacion: [{ ...period, unidad: 'dias' }] }, 'Decreto', documentText + quote)).toThrow(ReviewRequiredError)
  })
  it('acepta un plazo explícito único en días para el campo heredado', () => {
    const raw = impactResponse()
    const quote = 'Las viviendas existentes deberán adaptarse en el plazo de treinta días.'
    const result = normalizeImpact({ ...raw, plazos_adaptacion: [{ ...raw.plazos_adaptacion[0], cantidad: 30, unidad: 'dias', cita: quote }] }, 'Decreto', documentText + quote)
    expect(result.plazo_adaptacion).toBe(30)
  })
  it.each(['sesenta y seis', 'ciento seis', '1,6', '1.006'])('no toma el final de %s como un plazo de seis meses', amount => {
    const raw = impactResponse()
    const quote = `Las viviendas existentes deberán adaptarse en el plazo de ${amount} meses.`
    expect(() => normalizeImpact({ ...raw, plazos_adaptacion: [{ ...raw.plazos_adaptacion[0], cantidad: 6, cita: quote }] }, 'Decreto', documentText + quote)).toThrow(ReviewRequiredError)
  })
  it('exige una cita acotada si entrada y efectos contienen varias fechas', () => {
    const quote = 'Entrará en vigor el 2 de enero de 2025 y surtirá efectos el 1 de julio de 2025.'
    expect(() => normalizeImpact({ ...impactResponse(), entrada_vigor: { fecha: '2025-07-01', regla: null, cita: quote, localizador: 'DF' } }, 'Decreto', documentText + quote)).toThrow(ReviewRequiredError)
  })
  it('una publicación ausente queda null aunque el modelo invente una fecha', () => {
    expect(normalizeImpact({ ...impactResponse(), fecha_publicacion: '2019-10-10' }, 'Decreto', documentText).fecha_publicacion).toBeNull()
  })
  it('rechaza fechas oficiales imposibles y puntuaciones fraccionarias', () => {
    expect(() => normalizeImpact(impactResponse(), 'Decreto', documentText, { fecha_publicacion: '2026-02-30' })).toThrow(AnalysisError)
    expect(() => normalizeImpact({ ...impactResponse(), score_relevancia: 6.5 }, 'Decreto', documentText)).toThrow(AnalysisError)
  })
  it('rechaza una derogación sin evidencia dedicada', () => {
    expect(() => normalizeImpact({ ...impactResponse(), deroga_modifica: 'Deroga el decreto anterior' }, 'Decreto', documentText)).toThrow(/deroga_modifica/)
  })
  it('no añade acciones libres fuera de las acciones citadas', () => {
    const result = normalizeImpact({ ...impactResponse(), accion_recomendada: 'Paga una sanción inventada' }, 'Decreto', documentText)
    expect(result.accion_recomendada).not.toContain('sanción inventada')
  })
  it('los rangos oficiales tienen prioridad; los no representables conservan rango y null', () => {
    expect(documentRange('Decreto 1/2026')).toEqual({ rango: 'Decreto', tipo_norma: null })
    expect(documentRange('Real Decreto 1/2026')).toEqual({ rango: 'Real Decreto', tipo_norma: 'Real Decreto' })
    expect(documentRange('Título ambiguo', 'Resolución')).toEqual({ rango: 'Resolución', tipo_norma: 'Resolución' })
    expect(documentRange('Orden de una consejería')).toEqual({ rango: 'Orden', tipo_norma: null })
  })
  it('longitud no acredita texto completo, pero un texto corto sustantivo sí puede analizarse', () => {
    expect(() => requireSubstantiveText('Título', documentText.repeat(100), { contenido: 'sumario' })).toThrow(ReviewRequiredError)
    expect(() => requireSubstantiveText('Título', 'Se deroga el artículo 2.', { contenido: 'texto_completo' })).not.toThrow()
  })
  it('el conector RSS no se promociona a texto completo al hidratar', async () => {
    const item: NormalizedItem = { id: '1', fuente: 'BOCM', titulo: 'Título', texto: documentText, url: 'https://www.bocm.es/1' }
    expect((await hydrateDocument(item)).contenido).toBe('sumario')
  })
})
