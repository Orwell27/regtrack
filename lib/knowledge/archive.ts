import { KnowledgeVault, type KnowledgeRecord } from './vault'
import type { ImpactResult } from '../analysis/validation'
import type { NormalizedItem } from '../sources/boe'
import type { ScanReport } from '../pipeline/report'

export function archiveDocument(vault: KnowledgeVault | undefined, item: NormalizedItem, observedAt: string) {
  if (!vault) return
  return vault.put({ kind: 'norma', title: item.titulo, sourceUrl: item.url, publisher: item.fuente,
    observedAt, publishedAt: item.fecha_publicacion, content: item.texto || item.titulo,
    contentKind: item.contenido === 'texto_completo' && item.texto ? 'texto_completo' : 'sumario',
  })
}

export function archiveReport(vault: KnowledgeVault | undefined, report: ScanReport) {
  if (!vault) return
  vault.put({ kind: 'reporte', title: `Escaneo ${report.startedAt}`, sourceUrl: `urn:regtrack:scan:${report.startedAt}`,
    publisher: 'RegTrack', observedAt: new Date().toISOString(), contentKind: 'derivado',
    content: JSON.stringify({ mode: report.mode, dates: report.dates, finished: report.finished,
      incomplete: report.incomplete, sources: report.sources, decisions: report.decisions, fatal: report.fatal }, null, 2),
  })
}

export function archiveAnalysis(vault: KnowledgeVault | undefined, source: KnowledgeRecord | undefined, analysis: ImpactResult, observedAt = new Date().toISOString()) {
  if (!vault || !source) return
  if (source.kind !== 'norma' || source.contentKind !== 'texto_completo') throw new Error('El análisis necesita una versión de texto completo')
  return vault.put({ kind: 'analisis', title: `Lectura de ${source.title}`, publisher: 'RegTrack · análisis pendiente de revisión',
    sourceUrl: `urn:regtrack:analysis:${source.id}:${source.version}`, observedAt, contentKind: 'derivado', relatedTo: [source.id],
    content: JSON.stringify({ schema: 'regtrack.analysis.v1', sourceVersion: source.version, sourceHash: source.contentHash, analysis }) })
}
