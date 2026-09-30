import type { KnowledgeRecord } from './vault'

export const KIND_LABELS = { norma: 'Normativa', noticia: 'Noticias', cambio_web: 'Cambios web', analisis: 'Análisis', reporte: 'Reportes' }
export const CONTENT_LABELS = { texto_completo: 'Texto completo', sumario: 'Solo sumario', extracto: 'Extracto', derivado: 'Contenido elaborado' }
const ordered = (records: KnowledgeRecord[]) => [...records].sort((a, b) => b.observedAt.localeCompare(a.observedAt) || b.version.localeCompare(a.version))
export function latestRecords(records: KnowledgeRecord[]) {
  const ids = new Set<string>()
  return ordered(records).filter(r => { if (ids.has(r.id)) return false; ids.add(r.id); return true })
}
export function filterRecords(records: KnowledgeRecord[], query = '', kind = '') {
  const terms = query.toLocaleLowerCase('es').trim().split(/\s+/).filter(Boolean)
  return latestRecords(records).filter(r => (!kind || r.kind === kind) && terms.every(t => `${r.title} ${r.publisher} ${r.content}`.toLocaleLowerCase('es').includes(t)))
}
export interface Reading { summary: string; impact: string; actions: { accion: string; cita: string; localizador: string }[]; evidence: { campo: string; cita: string; localizador: string }[]; record: KnowledgeRecord }
export function dossier(records: KnowledgeRecord[], id: string, version?: string) {
  const history = ordered(records.filter(r => r.id === id))
  const selected = version ? history.find(r => r.version === version) : history[0]
  if (!selected) return null
  const related = latestRecords(records.filter(r => r.id !== id &&
    (selected.relatedTo?.includes(r.id) || r.relatedTo?.includes(id))))
  // A later analysis can describe this exact source version, but never silently another version.
  const analyses = ordered(records.filter(r => r.kind === 'analisis' && r.relatedTo?.includes(id)))
  let reading: Reading | undefined
  for (const record of analyses) {
    try {
      const payload = JSON.parse(record.content)
      if (payload.schema !== 'regtrack.analysis.v1' || payload.sourceVersion !== selected.version || payload.sourceHash !== selected.contentHash) continue
      const a = payload.analysis
      const quoteExists = (q: { cita: string; localizador: string }) => typeof q.cita === 'string' && typeof q.localizador === 'string' &&
        q.cita.trim().length >= 20 && selected.content.replace(/\s+/g, ' ').includes(q.cita.replace(/\s+/g, ' '))
      if (typeof a?.resumen !== 'string' || typeof a.impacto !== 'string' || !Array.isArray(a.evidencias) || !Array.isArray(a.acciones) ||
        !a.evidencias.every(quoteExists) || !a.acciones.every((q: { accion: string; cita: string; localizador: string }) => typeof q.accion === 'string' && quoteExists(q)) ||
        !['resumen', 'impacto'].every(field => a.evidencias.some((q: { campo: string }) => q.campo === field))) continue
      reading = { summary: a.resumen, impact: a.impacto, actions: a.acciones, evidence: a.evidencias, record }
      break
    } catch { /* Unstructured/legacy analysis remains archived, not promoted to a legal explanation. */ }
  }
  return { selected, history, related, reading, previous: history[history.indexOf(selected) + 1] }
}

export function sourceLink(url: string) {
  try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null } catch { return null }
}
