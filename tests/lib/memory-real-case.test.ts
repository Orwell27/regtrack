import { mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { KnowledgeVault } from '@/lib/knowledge/vault'
import { archiveAnalysis } from '@/lib/knowledge/archive'
import { dossier } from '@/lib/knowledge/dossier'
import { backupVault, restoreBackup } from '@/lib/knowledge/backup'
import { murciaHistoricalReading } from '@/eval/memory/murcia'

it('caso real Murcia: fuente íntegra → lectura citada → recuperación, sin convertir el plazo histórico en actual', () => {
  const root = mkdtempSync(join(tmpdir(), 'regtrack-murcia-')), vault = new KnowledgeVault(join(root, 'vault'))
  const source = vault.put({ kind: 'norma', title: 'Decreto n.º 256/2019, de 10 de octubre, sobre viviendas de uso turístico en Murcia',
    sourceUrl: 'https://www.borm.es/services/anuncio/780550/txt', publisher: 'BORM', publishedAt: '2019-10-19', observedAt: '2026-09-30T17:51:00Z',
    contentKind: 'texto_completo', content: readFileSync('tests/fixtures/borm-2019-6433.txt', 'utf8') })
  const analysis = murciaHistoricalReading(source)
  expect(analysis.plazos_adaptacion[0]).toMatchObject({ cantidad: 6, unidad: 'meses' })
  expect(analysis.plazo_adaptacion).toBeNull()
  expect(analysis.fecha_entrada_vigor).toBeNull()
  archiveAnalysis(vault, source, analysis)
  const saved = dossier(vault.list(), source.id)!
  expect(saved.reading!.summary).toContain('no empieza de nuevo')
  expect(saved.reading!.evidence.some(e => e.localizador === 'Artículo 6.1')).toBe(true)
  expect(saved.reading!.limitations.join(' ')).toContain('No es un resultado del escáner')
  expect(saved.selected.review).toBe('pendiente')
  backupVault(vault, join(root, 'backup'))
  restoreBackup(join(root, 'backup'), join(root, 'restored'))
  expect(dossier(new KnowledgeVault(join(root, 'restored')).list(), source.id)?.reading).toEqual(saved.reading)
  expect(() => murciaHistoricalReading({ ...source, contentKind: 'sumario' })).toThrow('publicación completa')
  expect(() => murciaHistoricalReading({ ...source, content: source.content + ' Modificación posterior.' })).toThrow('otra versión')
})
