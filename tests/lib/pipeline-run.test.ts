import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BadRequestError } from '@anthropic-ai/sdk'
import { runPipeline } from '@/lib/pipeline/run'

const mocks = vi.hoisted(() => ({ collect: vi.fn(), hydrate: vi.fn(), classify: vi.fn(), impact: vi.fn(), from: vi.fn(), insert: vi.fn(), lookup: vi.fn(), createDb: vi.fn() }))
vi.mock('@/lib/pipeline/sources', () => ({ collectSources: mocks.collect, hydrateDocument: mocks.hydrate }))
vi.mock('@/lib/claude', () => ({ classifyDocument: mocks.classify, analyzeImpact: mocks.impact }))
vi.mock('@/lib/supabase', () => ({ createServerClient: mocks.createDb }))
vi.mock('@/lib/correlacion/detectar-relaciones', () => ({ detectarRelaciones: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/correlacion/guardar-relaciones', () => ({ guardarRelaciones: vi.fn() }))
vi.mock('@/lib/sectorial/clasificar', () => ({ clasificarSectorial: vi.fn() }))

const item = { id: 'BORM-A-300926-4715', fuente: 'BORM', titulo: 'Resolución', url: 'https://www.borm.es/#/home/anuncio/30-09-2026/4715', texto: 'Sumario', fecha_publicacion: '2026-09-30' }
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
