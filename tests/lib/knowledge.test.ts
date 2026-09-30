import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'
import { KnowledgeVault, markdown, parseInput } from '@/lib/knowledge/vault'
import { archiveDocument, archiveReport } from '@/lib/knowledge/archive'
import { ScanReport } from '@/lib/pipeline/report'
import { toFtm } from '@/lib/knowledge/ftm'
import { syncRecords } from '@/lib/integrations/sync'

const input = { kind: 'norma', title: 'Vivienda', sourceUrl: 'https://www.boe.es/ejemplo', publisher: 'BOE',
  observedAt: '2026-09-30T10:00:00Z', content: 'Texto original con requisitos.', contentKind: 'texto_completo' }
const vault = () => new KnowledgeVault(mkdtempSync(join(tmpdir(), 'regtrack-knowledge-')))

describe('memoria versionada y consumidores', () => {
  it('conserva versiones, consulta qué se conocía y deduplica el reintento exacto', () => {
    const v = vault(), first = v.put(input)
    expect(v.put(input).version).toBe(first.version)
    const later = v.put({ ...input, observedAt: '2026-10-01T12:00:00Z', content: 'Texto corregido.' })
    expect(later.id).toBe(first.id)
    expect(v.list()).toHaveLength(2)
    expect(v.search('original', '2026-09-30T23:59:59Z')[0].version).toBe(first.version)
    expect(v.search('corregido')[0].version).toBe(later.version)
    expect(v.search('original')).toHaveLength(0)
  })
  it('ni una noticia ni un informe se promueven a hechos jurídicos', () => {
    const r = vault().put({ ...input, kind: 'noticia', review: 'aprobado', legalStatus: 'vigente' })
    expect(r).toMatchObject({ kind: 'noticia', review: 'pendiente', legalStatus: 'sin_verificar' })
    expect(markdown(r)).toContain('no son fuentes independientes')
    expect(toFtm(r).properties.notes[0]).toContain('pendiente')
    expect(toFtm(r).properties).not.toHaveProperty('contentHash')
  })
  it.each([{ sourceUrl: 'file:///secret' }, { sourceUrl: 'https://user:pass@example.com' }, { observedAt: '2026-09-30' }, { relatedTo: ['../../outside'] }, { content: '' }, { publishedAt: '2026-02-30' }])('rechaza entrada inválida %j', invalid => {
    expect(() => parseInput({ ...input, ...invalid })).toThrow()
  })
  it('detecta corrupción del texto almacenado antes de buscar o exportar', () => {
    const v = vault(); v.put(input)
    const path = join(v.root, '.records', readdirSync(join(v.root, '.records'))[0])
    const json = JSON.parse(readFileSync(path, 'utf8')); json.content = 'Sustituido'
    writeFileSync(path, JSON.stringify(json))
    expect(() => v.list()).toThrow('Integridad')
  })
  it('el puente archiva sumarios sin etiquetarlos como texto completo y conserva errores', () => {
    const v = vault()
    archiveDocument(v, { id: '1', titulo: 'Título', fuente: 'BOE', url: input.sourceUrl }, input.observedAt)
    const report = new ScanReport(['2026-09-30']); report.fatal.push('Fuente inaccesible'); report.finished = true
    archiveReport(v, report)
    expect(v.list().find(r => r.kind === 'norma')?.contentKind).toBe('sumario')
    expect(v.list().find(r => r.kind === 'reporte')?.content).toContain('Fuente inaccesible')
  })
  it('reanuda exportaciones fallidas, limita cada lote y separa destinos', async () => {
    const v = vault(); v.put(input); v.put({ ...input, sourceUrl: 'https://example.org/2' })
    const fail = vi.fn().mockRejectedValue(new Error('503'))
    await expect(syncRecords(v, 'destino', fail, { limit: 1 })).rejects.toThrow('503')
    const send = vi.fn().mockResolvedValue({ status: 'accepted' })
    expect(await syncRecords(v, 'destino', send, { limit: 1 })).toMatchObject({ sent: 1, remaining: 1 })
    expect(await syncRecords(v, 'destino', send, { limit: 10 })).toMatchObject({ sent: 1, skipped: 1 })
    expect(await syncRecords(v, 'destino', send, { limit: 10 })).toMatchObject({ sent: 0, skipped: 2 })
    expect(await syncRecords(v, 'otro-destino', send, { limit: 10 })).toMatchObject({ sent: 2 })
  })
  it('un acuse queued no provoca consumos repetidos ni se convierte en completed', async () => {
    const v = vault(); v.put(input)
    const send = vi.fn().mockResolvedValue({ status: 'queued', uuid: 'episode' })
    expect((await syncRecords(v, 'graphiti', send, { limit: 1 })).receipts[0].status).toBe('queued')
    await syncRecords(v, 'graphiti', send, { limit: 1 })
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('dos sincronizaciones concurrentes no envían ni cobran el mismo lote dos veces', async () => {
    const v = vault(); v.put(input)
    let finish!: () => void
    const gate = new Promise<void>(resolve => { finish = resolve })
    const send = vi.fn(async () => { await gate; return { status: 'queued' as const } })
    const first = syncRecords(v, 'graphiti', send, { limit: 1 })
    await expect(syncRecords(v, 'graphiti', send, { limit: 1 })).rejects.toThrow('bloqueada')
    finish(); await first
    expect(send).toHaveBeenCalledTimes(1)
  })
})
