import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KnowledgeVault } from '@/lib/knowledge/vault'
import { BadRequestError } from '@anthropic-ai/sdk'
import { runPipeline } from '@/lib/pipeline/run'
import { SourceAccessBlockedError } from '@/lib/sources/http'
import { normalizeImpact, ReviewRequiredError } from '@/lib/analysis/validation'
import { documentText, impactResponse } from '../fixtures/impact-response'

const mocks = vi.hoisted(() => ({ collect: vi.fn(), hydrate: vi.fn(), classify: vi.fn(), impact: vi.fn(), from: vi.fn(), insert: vi.fn(), lookup: vi.fn(), createDb: vi.fn() }))
vi.mock('@/lib/pipeline/sources', () => ({ collectSources: mocks.collect, hydrateDocument: mocks.hydrate }))
vi.mock('@/lib/claude', () => ({ classifyDocument: mocks.classify, analyzeImpact: mocks.impact }))
vi.mock('@/lib/supabase', () => ({ createServerClient: mocks.createDb }))
vi.mock('@/lib/correlacion/detectar-relaciones', () => ({ detectarRelaciones: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/correlacion/guardar-relaciones', () => ({ guardarRelaciones: vi.fn() }))
vi.mock('@/lib/sectorial/clasificar', () => ({ clasificarSectorial: vi.fn() }))

const item = { id: 'BORM-A-300926-4715', fuente: 'BORM', titulo: 'Resolución', url: 'https://www.borm.es/#/home/anuncio/30-09-2026/4715', texto: 'Sumario', fecha_publicacion: '2026-09-30' }
afterEach(() => vi.unstubAllEnvs())
function directory() { return mkdtempSync(join(tmpdir(), 'regtrack-test-')) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.collect.mockImplementation(async report => {
    report.sources.push({ source: 'BORM', scope: '2026-09-30', status: 'ok', count: 1 })
    return [item]
  })
  mocks.hydrate.mockImplementation(async i => ({ ...i, texto: 'Texto oficial completo' }))
  mocks.classify.mockResolvedValue({ relevante: false, motivo: 'Personal sanitario', subtema: 'otro', ambito_territorial: 'ccaa' })
  mocks.lookup.mockResolvedValue({ data: [], error: null })
  mocks.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'saved' }, error: null }) }) })
  mocks.from.mockReturnValue({ select: () => ({ in: mocks.lookup }), insert: mocks.insert })
  mocks.createDb.mockReturnValue({ from: mocks.from })
})

describe('recorrido completo sin IA ni BD reales', () => {
  it('con memoria configurada conserva fuente y reporte que puede leer otro proceso', async () => {
    const root = directory()
    vi.stubEnv('REGTRACK_KNOWLEDGE_DIR', root)
    await runPipeline(['2026-09-30'], { reportDir: directory() })
    const records = new KnowledgeVault(root).list()
    expect(records.filter(r => r.kind === 'norma')).toHaveLength(2)
    expect(records.find(r => r.kind === 'reporte')?.content).toContain('discarded')
    expect(records.every(r => r.review === 'pendiente')).toBe(true)
  })
  it('una memoria configurada inaccesible falla y deja el motivo en el reporte', async () => {
    const root = directory(), file = join(root, 'not-a-directory')
    writeFileSync(file, 'x')
    vi.stubEnv('REGTRACK_KNOWLEDGE_DIR', file)
    await expect(runPipeline(['2026-09-30'], { reportDir: root })).rejects.toThrow('memoria')
    expect(JSON.parse(readFileSync(join(root, 'scan-report.json'), 'utf8')).status).toBe('incomplete')
    expect(mocks.classify).not.toHaveBeenCalled()
  })
  it('un sumario extenso sigue pendiente: no llama IA ni inserta una alerta', async () => {
    mocks.hydrate.mockResolvedValueOnce({ ...item, contenido: 'sumario', texto: 'Un sumario extenso. '.repeat(200) })
    const dir = directory()
    const report = await runPipeline(['2026-09-30'], { reportDir: dir })
    expect(report.decisions[0].status).toBe('needs_review')
    expect(report.incomplete).toBe(true)
    expect(mocks.classify).not.toHaveBeenCalled()
    expect(mocks.impact).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(readFileSync(join(dir, 'scan-summary.md'), 'utf8')).toContain('revisión documental: 1')
  })
  it('una revisión exigida por el análisis no se convierte en descarte o inserción y se vuelve a intentar', async () => {
    mocks.classify.mockResolvedValue({ relevante: true, subtema: 'arrendamiento', ambito_territorial: 'ccaa' })
    mocks.impact.mockRejectedValue(new ReviewRequiredError('Falta cita de la obligación'))
    const options = { reportDir: directory() }
    expect((await runPipeline(['2026-09-30'], options)).decisions[0].status).toBe('needs_review')
    expect((await runPipeline(['2026-09-30'], options)).decisions[0].status).toBe('needs_review')
    expect(mocks.impact).toHaveBeenCalledTimes(2)
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it('persiste la unidad y las citas en campos legibles sin inventar días ni nuevas columnas', async () => {
    const meta = { fecha_publicacion: '2019-10-19', rango: 'Decreto' }
    const impact = normalizeImpact(impactResponse(), 'Decreto 256/2019', documentText, meta)
    mocks.hydrate.mockResolvedValueOnce({ ...item, ...meta, texto: documentText, contenido: 'texto_completo' })
    mocks.classify.mockResolvedValue({ relevante: true, subtema: 'arrendamiento', ambito_territorial: 'ccaa' })
    mocks.impact.mockResolvedValueOnce(impact)
    const report = await runPipeline(['2026-09-30'], { reportDir: directory() })
    const saved = mocks.insert.mock.calls[0][0]
    expect(saved).toMatchObject({ tipo_norma: null, rango: 'Decreto', plazo_adaptacion: null, fecha_entrada_vigor: null, fecha_publicacion: '2019-10-19', estado: 'pendiente_revision' })
    expect(saved.impacto).toContain('6 meses')
    expect(saved.accion_recomendada).toContain(impact.acciones[0].cita)
    expect(saved).not.toHaveProperty('plazos_adaptacion')
    expect(report.decisions[0].analysis?.plazos_adaptacion[0].cantidad).toBe(6)
    expect(mocks.impact.mock.calls[0][3]).toMatchObject({ ...meta, contenido: 'texto_completo' })
  })
  it('no descarga documentos de una fecha anterior si la fuente se bloqueó al recopilar otra fecha', async () => {
    mocks.collect.mockImplementationOnce(async report => {
      const items = await report.source('BORM', '2026-09-29', async () => [item])
      await report.source('BORM', '2026-09-30', async () => { throw new SourceAccessBlockedError('CAPTCHA') })
      return items
    })
    const report = await runPipeline(['2026-09-29', '2026-09-30'], { reportDir: directory() })
    expect(mocks.hydrate).not.toHaveBeenCalled()
    expect(mocks.classify).not.toHaveBeenCalled()
    expect(report.decisions[0].status).toBe('unprocessed')
    expect(report.incomplete).toBe(true)
  })
  it('un CAPTCHA al descargar texto detiene esa fuente y permite procesar las demás', async () => {
    mocks.collect.mockResolvedValueOnce([item, { ...item, url: item.url + '-2' }, { ...item, fuente: 'BOCM', url: 'https://www.bocm.es/1' }])
    mocks.hydrate.mockRejectedValueOnce(new SourceAccessBlockedError('CAPTCHA BORM'))
    const report = await runPipeline(['2026-09-30'], { reportDir: directory() })
    expect(mocks.hydrate).toHaveBeenCalledTimes(2)
    expect(mocks.classify).toHaveBeenCalledTimes(1)
    expect(report.decisions.map(d => d.status)).toEqual(['error', 'unprocessed', 'discarded'])
    expect(report.incomplete).toBe(true)
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it('guarda una alerta legítima con fecha oficial y texto completo en ambos análisis', async () => {
    mocks.classify.mockResolvedValueOnce({ relevante: true, subtema: 'arrendamiento', ambito_territorial: 'ccaa' })
    mocks.impact.mockResolvedValueOnce({ resumen: 'Cambio', impacto: 'Impacto', afectados: ['propietarios'], urgencia: 'media', territorios: ['Murcia'], accion_recomendada: 'Revisar', score_relevancia: 7, fecha_publicacion: '2020-01-01' })
    const report = await runPipeline(['2026-09-30'], { reportDir: directory() })
    expect(report.incomplete).toBe(false)
    expect(report.decisions[0].status).toBe('saved')
    expect(mocks.classify.mock.calls[0][1]).toBe('Texto oficial completo')
    expect(mocks.impact.mock.calls[0][1]).toBe('Texto oficial completo')
    expect(mocks.insert.mock.calls[0][0]).toMatchObject({ fecha_publicacion: '2026-09-30', estado: 'pendiente_revision', no_procesable: false })
  })
  it('un fallo de clasificación permanece reintentable y hace incompleta la ejecución', async () => {
    mocks.classify.mockRejectedValueOnce(new SyntaxError('JSON inválido'))
    const reportDir = directory()
    const report = await runPipeline(['2026-09-30'], { reportDir })
    expect(report.incomplete).toBe(true)
    expect(report.decisions[0].status).toBe('error')
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(JSON.parse(readFileSync(join(reportDir, 'scan-report.json'), 'utf8')).status).toBe('incomplete')
    expect((await runPipeline(['2026-09-30'], { reportDir })).decisions[0].status).toBe('discarded')
    expect(mocks.classify).toHaveBeenCalledTimes(2)
  })
  it('no interpreta el sumario cuando falla la descarga del texto completo', async () => {
    mocks.hydrate.mockRejectedValueOnce(new Error('BORM TXT 503'))
    const report = await runPipeline(['2026-09-30'], { reportDir: directory() })
    expect(report.decisions[0].status).toBe('error')
    expect(mocks.classify).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it('un impacto inválido nunca se contabiliza como score bajo', async () => {
    mocks.classify.mockResolvedValueOnce({ relevante: true, subtema: 'arrendamiento' })
    mocks.impact.mockResolvedValueOnce(null)
    const report = await runPipeline(['2026-09-30'], { reportDir: directory() })
    expect(report.decisions[0].status).toBe('error')
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it('si falla la deduplicación no intenta insertar todo y conserva el informe', async () => {
    mocks.lookup.mockResolvedValueOnce({ data: null, error: { message: 'BD no disponible' } })
    const reportDir = directory()
    await expect(runPipeline(['2026-09-30'], { reportDir })).rejects.toThrow('BD no disponible')
    expect(mocks.insert).not.toHaveBeenCalled()
    const report = JSON.parse(readFileSync(join(reportDir, 'scan-report.json'), 'utf8'))
    expect(report.status).toBe('incomplete')
    expect(report.decisions[0].status).toBe('unprocessed')
  })
  it('el diagnóstico de fuentes no crea clientes de BD ni llama a la IA', async () => {
    await runPipeline(['2026-09-30'], { scanOnly: true, reportDir: directory() })
    expect(mocks.createDb).not.toHaveBeenCalled()
    expect(mocks.classify).not.toHaveBeenCalled()
  })
  it('tras tres errores API guarda también qué documentos quedaron sin procesar', async () => {
    mocks.collect.mockResolvedValueOnce(Array.from({ length: 5 }, (_, i) => ({ ...item, url: item.url + i })))
    mocks.classify.mockRejectedValue(new BadRequestError(400, {}, 'sin saldo', new Headers()))
    const reportDir = directory()
    await expect(runPipeline(['2026-09-30'], { reportDir })).rejects.toThrow('detenido')
    const report = JSON.parse(readFileSync(join(reportDir, 'scan-report.json'), 'utf8'))
    expect(report.decisions.filter((d: { status: string }) => d.status === 'error')).toHaveLength(3)
    expect(report.decisions.filter((d: { status: string }) => d.status === 'unprocessed')).toHaveLength(2)
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
