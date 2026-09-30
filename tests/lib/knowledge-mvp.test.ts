import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'
import { KnowledgeVault } from '@/lib/knowledge/vault'
import { seedMemoryDemo } from '@/lib/knowledge/demo'
import { backupVault, restoreBackup, verifyBackup } from '@/lib/knowledge/backup'
import { dossier, filterRecords, sourceLink } from '@/lib/knowledge/dossier'
import { syncRecords } from '@/lib/integrations/sync'

const setup = () => { const root = mkdtempSync(join(tmpdir(), 'regtrack-mvp-')); const vault = new KnowledgeVault(join(root, 'vault')); const id = seedMemoryDemo(vault); return { root, vault, id } }
describe('MVP: conservar, explicar y recuperar', () => {
  it('recorre captura → análisis citado → relación y conserva el historial', () => {
    const { vault, id } = setup(), records = vault.list(), view = dossier(records, id)!
    expect(view.history).toHaveLength(3)
    expect(view.reading?.summary).toContain('nueve meses')
    expect(view.reading?.evidence[0].cita).toContain('9 meses')
    expect(view.related.some(r => r.kind === 'noticia')).toBe(true)
    expect(filterRecords(records, 'alojamientos', 'norma')).toHaveLength(1)
    expect(records.find(r => r.kind === 'reporte')?.content).toContain('needs_review')
    const old = dossier(records, id, view.history[1].version)!
    expect(old.selected.content).toContain('6 meses')
    expect(old.reading).toBeUndefined()
    expect(dossier(records, id, 'unknown')).toBeNull()
  })
  it('un sumario más reciente no hereda la explicación de un texto completo anterior', () => {
    const { vault, id } = setup(), current = dossier(vault.list(), id)!.selected
    vault.put({ ...current, content: current.title, contentKind: 'sumario', observedAt: '2026-10-01T08:00:00Z' })
    expect(dossier(vault.list(), id)?.reading).toBeUndefined()
    expect(dossier(vault.list(), id, current.version)?.reading).toBeDefined()
  })
  it('ignora una explicación cuyo texto citado no pertenece a la captura', () => {
    const { vault, id } = setup(), r = dossier(vault.list(), id)!.reading!.record
    const content = JSON.parse(r.content); content.analysis.evidencias[0].cita = 'Una cita inventada que no existe en este documento'
    vault.put({ ...r, content: JSON.stringify(content), observedAt: '2026-10-01T08:00:00Z' })
    // The older valid analysis is still recoverable; the invented one is never displayed.
    expect(dossier(vault.list(), id)?.reading?.record.version).toBe(r.version)
    expect(sourceLink('urn:regtrack:internal')).toBeNull()
    expect(sourceLink('javascript:alert(1)')).toBeNull()
  })
  it('restaura bytes, versiones y acuses sin volver a enviar o consumir modelos', async () => {
    const { root, vault, id } = setup()
    await syncRecords(vault, 'test', async () => ({ status: 'queued' }), { limit: 100 })
    const backup = join(root, 'backup'), restored = join(root, 'restored')
    const saved = backupVault(vault, backup)
    expect(saved.records).toBeGreaterThan(0)
    expect(verifyBackup(backup).records).toBe(saved.records)
    restoreBackup(backup, restored)
    const recovered = new KnowledgeVault(restored)
    expect(recovered.list()).toEqual(vault.list())
    expect(dossier(recovered.list(), id)?.reading?.summary).toContain('nueve meses')
    const send = vi.fn()
    expect((await syncRecords(recovered, 'test', send, { limit: 100 })).sent).toBe(0)
    expect(send).not.toHaveBeenCalled()
  })
  it('rechaza corrupción antes de restaurar y no toca un destino existente', () => {
    const { root, vault } = setup(), backup = join(root, 'backup')
    backupVault(vault, backup)
    expect(() => restoreBackup(backup, vault.root)).toThrow('ya existe')
    const record = readdirSync(join(backup, 'vault', '.records'))[0]
    writeFileSync(join(backup, 'vault', '.records', record), '{}')
    const dest = join(root, 'must-not-exist')
    expect(() => restoreBackup(backup, dest)).toThrow('alterado')
    expect(existsSync(dest)).toBe(false)
  })
  it('rechaza un respaldo dentro del origen, candados activos y rutas que escapan', () => {
    const { root, vault } = setup()
    expect(() => backupVault(vault, join(vault.root, 'backup'))).toThrow('fuera del origen')
    const backup = join(root, 'backup'); backupVault(vault, backup)
    const manifestPath = join(backup, 'manifest.json'), m = JSON.parse(readFileSync(manifestPath, 'utf8'))
    m.files[0].path = '../escape'
    writeFileSync(manifestPath, JSON.stringify(m))
    expect(() => verifyBackup(backup)).toThrow('Ruta o huella')
    writeFileSync(join(vault.root, '.receipts', 'active.lock'), 'busy')
    expect(() => backupVault(vault, join(root, 'locked'))).toThrow('ocupado')
  })
})
