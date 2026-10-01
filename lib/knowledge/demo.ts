import { KnowledgeVault } from './vault'
import { archiveAnalysis, archiveDocument, archiveReport } from './archive'
import { normalizeImpact } from '../analysis/validation'
import { ScanReport } from '../pipeline/report'

/** Clearly fictional fixtures. No network, models, credentials or production writes. */
export function seedMemoryDemo(vault: KnowledgeVault) {
  const title = 'EJEMPLO FICTICIO · Registro de alojamientos de demostración'
  const url = 'https://example.org/regtrack/norma-ficticia'
  const original = 'Artículo 1. Los titulares de los alojamientos de ejemplo disponen de 6 meses desde la publicación para presentar una declaración de actividad.'
  const revised = original.replace('6 meses', '9 meses')
  const item = { id: 'demo', titulo: title, fuente: 'BOE' as const, url, fecha_publicacion: '2026-09-28' }
  archiveDocument(vault, { ...item, texto: title, contenido: 'sumario' }, '2026-09-28T08:00:00Z')
  archiveDocument(vault, { ...item, texto: `Documento ficticio, sin valor jurídico.\n\n${original}`, contenido: 'texto_completo' }, '2026-09-29T08:00:00Z')
  const current = archiveDocument(vault, { ...item, texto: `Documento ficticio, sin valor jurídico.\n\n${revised}`, contenido: 'texto_completo' }, '2026-09-30T08:00:00Z')!
  const impact = normalizeImpact({ estado_analisis: 'suficiente', resumen: 'En este ejemplo, los titulares disponen de nueve meses para presentar la declaración. La captura anterior decía seis meses.',
    impacto: 'Permite probar cómo se conserva un plazo y cómo se consulta la evidencia. No describe una obligación real.',
    afectados: ['Titulares de alojamientos de ejemplo'], urgencia: 'baja', score_relevancia: 5, deroga_modifica: null, territorios: ['Territorio ficticio'],
    entrada_vigor: { fecha: null, regla: null, cita: null, localizador: null }, efectos: [],
    plazos_adaptacion: [{ cantidad: 9, unidad: 'meses', inicio: 'publicación', destinatarios: 'titulares de los alojamientos de ejemplo', cita: revised, localizador: 'Artículo 1 ficticio' }],
    acciones: [{ accion: 'En el caso de demostración: revisar el plazo de la declaración.', cita: revised, localizador: 'Artículo 1 ficticio' }],
    evidencias: ['resumen', 'impacto'].map(campo => ({ campo, cita: revised, localizador: 'Artículo 1 ficticio' })), limitaciones: ['Caso ficticio para probar la interfaz.'],
  }, title, current.content, { fecha_publicacion: '2026-09-28' })
  archiveAnalysis(vault, current, impact, '2026-09-30T08:05:00Z')
  vault.put({ kind: 'noticia', title: 'EJEMPLO FICTICIO · Una asociación comenta el plazo de declaración', publisher: 'Medio ficticio',
    sourceUrl: 'https://example.org/regtrack/noticia-ficticia', publishedAt: '2026-09-30', observedAt: '2026-09-30T09:00:00Z',
    content: 'Noticia ficticia: una asociación de ejemplo comenta el plazo de declaración. El enlace a la norma es una relación documental propuesta, no una prueba independiente de su vigencia.', contentKind: 'extracto', relatedTo: [current.id] })
  const report = new ScanReport(['2026-09-30'])
  report.startedAt = '2026-09-30T08:00:00Z'
  report.sources.push({ source: 'FUENTE FICTICIA', scope: 'demostración', status: 'ok', count: 1 })
  report.decision(item, 'needs_review', 'Demostración: pendiente de revisión humana', impact)
  report.finished = true
  archiveReport(vault, report)
  return current.id
}
