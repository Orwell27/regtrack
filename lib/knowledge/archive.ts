import { KnowledgeVault } from './vault'
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
