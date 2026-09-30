import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

export type Outcome = 'alert' | 'discard' | 'needs_review' | 'error'
export interface PilotCase {
  id: string
  title: string
  source: 'BOE' | 'BORM'
  sourceUrl: string
  publicationDate: string
  retrievedAt: string | null
  textPath: string
  sha256: string
  inputKind: 'full_text' | 'summary_only'
  cohort: 'calibration'
  expectedOutcome: Exclude<Outcome, 'error'>
  reason: string
  provenance?: Record<string, unknown>
  reference: { status: 'proposed' | 'approved'; reviewer: string | null; reviewedAt: string | null }
  checks: { id: string; question: string; expectedAnswer: string; locator: string; quote: string }[]
}
export interface Corpus { version: 'regtrack-pilot-1'; scope: string; cases: PilotCase[] }
export interface Observation {
  caseId: string
  outcome: Outcome
  classification: unknown
  impact: unknown
  error?: string
  elapsedMs: number
}
export interface PilotRun {
  schemaVersion: 1
  mode: 'live' | 'simulated'
  corpusHash: string
  startedAt: string
  finishedAt: string | null
  provenance: Record<string, string>
  observations: Observation[]
}
export interface FactReview {
  caseId: string
  checkId: string
  verdict: 'pass' | 'fail'
  reviewer: string
  reviewedAt: string
  note: string
  // Cita del resultado que se revisó; null cuando se juzga una omisión.
  outputQuote: string | null
}
export interface ReviewFile { corpusHash: string; runHash: string; reviews: FactReview[] }

export const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')
/** Git puede convertir finales de línea en Windows; el texto evaluado siempre usa LF. */
export const canonicalText = (text: string) => text.replace(/\r\n/g, '\n')
// Aprobar una referencia no cambia el ensayo; cambiar texto, expectativas o checks sí.
export const corpusHash = (corpus: Corpus) => sha256(JSON.stringify({ ...corpus, cases: corpus.cases.map(item => ({ ...item, reference: undefined })) }))
export const runHash = (run: PilotRun) => sha256(JSON.stringify(run))
const normalized = (text: string) => text.replace(/\s+/g, ' ').trim()

export function validateCorpus(corpus: Corpus, readText: (path: string) => string): Map<string, string> {
  if (corpus.version !== 'regtrack-pilot-1' || !corpus.scope || !Array.isArray(corpus.cases) || !corpus.cases.length) throw new Error('Corpus vacío o versión desconocida')
  const inputs = new Map<string, string>()
  for (const item of corpus.cases) {
    if (!item.id || inputs.has(item.id)) throw new Error(`Caso duplicado o sin id: ${item.id}`)
    if (!item.title || !['BOE', 'BORM'].includes(item.source) || !/^https:\/\//.test(item.sourceUrl)) throw new Error(`Procedencia inválida: ${item.id}`)
    if (item.cohort !== 'calibration' || !['full_text', 'summary_only'].includes(item.inputKind) || !['alert', 'discard', 'needs_review'].includes(item.expectedOutcome)) throw new Error(`Alcance inválido: ${item.id}`)
    if (!['proposed', 'approved'].includes(item.reference?.status)) throw new Error(`Referencia sin revisar: ${item.id}`)
    if (item.reference.status === 'approved' && (!item.reference.reviewer?.trim() || !item.reference.reviewedAt)) throw new Error(`Aprobación sin responsable/fecha: ${item.id}`)
    const text = canonicalText(readText(item.textPath))
    if (!text.trim() || sha256(text) !== item.sha256) throw new Error(`Texto o SHA distinto al fijado: ${item.id}`)
    if (!Array.isArray(item.checks) || !item.checks.length) throw new Error(`Caso sin comprobaciones: ${item.id}`)
    const ids = new Set<string>()
    for (const check of item.checks) {
      if (!check.id || ids.has(check.id) || !check.question || !check.expectedAnswer || !check.locator || !check.quote?.trim()) throw new Error(`Comprobación inválida: ${item.id}`)
      if (!normalized(text).includes(normalized(check.quote))) throw new Error(`Cita ausente del texto de entrada: ${item.id}/${check.id}`)
      ids.add(check.id)
    }
    inputs.set(item.id, text)
  }
  return inputs
}

export function loadCorpus(path = 'eval/pilot/cases.json', root = process.cwd()) {
  const corpus = JSON.parse(readFileSync(resolve(root, path), 'utf8')) as Corpus
  const texts = validateCorpus(corpus, file => {
    const target = resolve(root, file)
    const rel = relative(root, target)
    if (isAbsolute(file) || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\')) throw new Error('El texto debe estar dentro del repositorio')
    return readFileSync(target, 'utf8')
  })
  return { corpus, texts }
}

/** Exportación ciega: ninguna etiqueta, explicación ni respuesta de referencia llega al modelo. */
export function modelInputs(corpus: Corpus, texts: Map<string, string>) {
  return corpus.cases.map(item => ({ caseId: item.id, titulo: item.title, fuente: item.source, texto: texts.get(item.id)! }))
}

function ratio(numerator: number, denominator: number) {
  return { numerator, denominator, value: denominator ? numerator / denominator : null }
}

export function evaluatePilot(corpus: Corpus, run?: PilotRun, reviewFile?: ReviewFile) {
  const cases = new Map(corpus.cases.map(item => [item.id, item]))
  const observations = new Map<string, Observation>()
  if (run) {
    if (run.schemaVersion !== 1 || !['live', 'simulated'].includes(run.mode) || run.corpusHash !== corpusHash(corpus)) throw new Error('Ejecución incompatible con el corpus fijado')
    for (const result of run.observations) {
      if (!cases.has(result.caseId) || observations.has(result.caseId)) throw new Error(`Resultado ajeno o duplicado: ${result.caseId}`)
      if (!['alert', 'discard', 'needs_review', 'error'].includes(result.outcome) || !Number.isFinite(result.elapsedMs) || result.elapsedMs < 0) throw new Error(`Resultado inválido: ${result.caseId}`)
      observations.set(result.caseId, result)
    }
  }
  if (reviewFile && (!run || reviewFile.corpusHash !== corpusHash(corpus) || reviewFile.runHash !== runHash(run))) throw new Error('Revisión de otra ejecución o corpus')
  const reviews = new Map<string, FactReview>()
  for (const review of reviewFile?.reviews ?? []) {
    const item = cases.get(review.caseId)
    const observation = observations.get(review.caseId)
    const key = `${review.caseId}/${review.checkId}`
    if (!item?.checks.some(check => check.id === review.checkId) || !observation || reviews.has(key)) throw new Error(`Revisión ajena, duplicada o sin resultado: ${key}`)
    if (!['pass', 'fail'].includes(review.verdict) || !review.reviewer?.trim() || !review.reviewedAt || !review.note?.trim()) throw new Error(`Revisión sin juicio, responsable o motivo: ${key}`)
    const outputText = (value: unknown): string => value == null ? '' : typeof value === 'object' ? Object.values(value).map(outputText).join('\n') : String(value)
    if (review.outputQuote !== null && (!review.outputQuote.trim() || !normalized(outputText([observation.classification, observation.impact, observation.error])).includes(normalized(review.outputQuote)))) throw new Error(`Cita de resultado no encontrada: ${key}`)
    reviews.set(key, review)
  }
  const hasResults = observations.size > 0
  const positives = corpus.cases.filter(item => item.expectedOutcome === 'alert')
  const incompleteInputs = corpus.cases.filter(item => item.expectedOutcome === 'needs_review')
  const alerts = [...observations.values()].filter(item => item.outcome === 'alert')
  const trueAlerts = alerts.filter(item => cases.get(item.caseId)!.expectedOutcome === 'alert').length
  const rows = corpus.cases.map(item => ({
    caseId: item.id, expected: item.expectedOutcome, actual: observations.get(item.id)?.outcome ?? 'missing',
    referenceStatus: item.reference.status,
    checks: item.checks.map(check => ({ id: check.id, verdict: reviews.get(`${item.id}/${check.id}`)?.verdict ?? 'pending' })),
  }))
  const factualTotal = rows.reduce((total, row) => total + row.checks.length, 0)
  const passed = [...reviews.values()].filter(review => review.verdict === 'pass').length
  const failed = reviews.size - passed
  const missing = rows.filter(row => row.actual === 'missing').map(row => row.caseId)
  const errors = rows.filter(row => row.actual === 'error').map(row => row.caseId)
  const provisional = corpus.cases.filter(item => item.reference.status !== 'approved').length
  return {
    corpusHash: corpusHash(corpus), runHash: run ? runHash(run) : null,
    status: !hasResults ? 'not_run' : missing.length || errors.length || !run?.finishedAt ? 'incomplete' : provisional || reviews.size < factualTotal ? 'requires_review' : 'reviewed',
    mode: run?.mode ?? 'not_run', cohort: 'calibration', scope: corpus.scope,
    totalCases: cases.size, observedCases: observations.size, referencesPending: provisional,
    metrics: {
      alertRecall: hasResults ? ratio(trueAlerts, positives.length) : null,
      alertPrecision: hasResults ? ratio(trueAlerts, alerts.length) : null,
      insufficientTextHandling: hasResults ? ratio(incompleteInputs.filter(item => observations.get(item.id)?.outcome === 'needs_review').length, incompleteInputs.length) : null,
      factualAccuracy: ratio(passed, passed + failed), factualReviewCoverage: ratio(passed + failed, factualTotal),
    },
    factualChecks: { total: factualTotal, passed, failed, pending: factualTotal - reviews.size },
    missing, errors,
    relevantWithoutAlert: hasResults ? positives.filter(item => observations.get(item.id)?.outcome !== 'alert').map(item => item.id) : [],
    falseAlerts: alerts.filter(item => cases.get(item.caseId)!.expectedOutcome !== 'alert').map(item => item.caseId),
    latencyMs: hasResults ? [...observations.values()].map(item => item.elapsedMs) : null,
    actualCost: null,
    limits: [provisional ? 'Referencias propuestas por Codex: no equivalen a revisión jurídica independiente.' : 'Las aprobaciones registradas requieren comprobar la identidad y competencia de sus revisores; este archivo no las autentica.', 'Muestra de calibración elegida a propósito; no es una estimación poblacional ni un conjunto reservado.', 'Evalúa el texto original publicado, no su vigencia actual.', 'El análisis de documentos no acredita cobertura de los escáneres, noticias ni autonomía.', 'Sin medición de coste facturado ni autorización automática para publicar.'],
    cases: rows,
  }
}

export function reviewPacket(corpus: Corpus) {
  return [
    '# Piloto RegTrack: referencias para revisar',
    '', 'Estado: **propuesta de Codex, pendiente de revisión humana**. Documentos históricos: interpretar lo que dice la publicación original, sin afirmar que siga vigente hoy.',
    'Esta muestra se utiliza para calibrar. Los resultados definitivos necesitan otros casos reservados y un muestreo que incluya documentos descartados y no recogidos.',
    '', ...corpus.cases.flatMap(item => [
      `## ${item.id} — ${item.title}`, '',
      `Fuente: [${item.source}, ${item.publicationDate}](${item.sourceUrl}). Entrada: ${item.inputKind === 'full_text' ? 'texto completo' : 'solo título/sumario'}.`,
      `Decisión propuesta: **${item.expectedOutcome}**. ${item.reason}`, '',
      item.expectedOutcome === 'discard' ? 'Control negativo: comprobar que no inventa efectos inmobiliarios. No se exige extraer ni mencionar todos los hechos de un documento correctamente descartado.' : 'Comprobar las afirmaciones y las omisiones de información necesaria para actuar.', '',
      ...item.checks.flatMap(check => [
        `### ${check.id}. ${check.question}`, '', `Respuesta de referencia propuesta: ${check.expectedAnswer}`, '',
        `Evidencia (${check.locator}):`, `> ${check.quote.replace(/\s+/g, ' ')}`, '',
        'Revisión: pendiente. Corregir referencia si procede; después comparar con la respuesta real del sistema.', '',
      ]),
    ]),
  ].join('\n') + '\n'
}

export function reportMarkdown(report: ReturnType<typeof evaluatePilot>) {
  const display = (metric: { numerator: number; denominator: number; value: number | null } | null) =>
    !metric || metric.value === null ? 'No medido' : `${metric.numerator}/${metric.denominator} (${(metric.value * 100).toFixed(1)}%)`
  return [
    '# Piloto RegTrack: estado de evaluación', '',
    `Ejecución: **${report.mode}**. Casos con resultado: **${report.observedCases}/${report.totalCases}**.`,
    `Referencias pendientes de aprobación: **${report.referencesPending}**. Comprobaciones factuales pendientes: **${report.factualChecks.pending}**.`, '',
    '| Medida | Resultado |', '|---|---|',
    `| Casos relevantes que producen alerta | ${display(report.metrics.alertRecall)} |`,
    `| Alertas que corresponden a casos relevantes | ${display(report.metrics.alertPrecision)} |`,
    `| Entradas insuficientes enviadas a revisión | ${display(report.metrics.insufficientTextHandling)} |`,
    `| Comprobaciones superadas entre las revisadas | ${display(report.metrics.factualAccuracy)} |`,
    `| Cobertura de revisión factual | ${display(report.metrics.factualReviewCoverage)} |`, '',
    'Una cifra favorable no autoriza la activación. Las ausencias y errores de una ejecución parcial permanecen en el denominador de los casos relevantes.', '',
    '## Límites', '', ...report.limits.map(limit => `- ${limit}`), '',
    '## Casos', '', '| Caso | Esperado | Observado |', '|---|---|---|',
    ...report.cases.map(item => `| ${item.caseId} | ${item.expected} | ${item.actual} |`), '',
  ].join('\n')
}
