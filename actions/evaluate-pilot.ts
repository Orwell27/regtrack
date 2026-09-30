import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import { ReviewRequiredError } from '../lib/analysis/validation'
import {
  canonicalText, corpusHash, evaluatePilot, loadCorpus, modelInputs, reportMarkdown,
  reviewPacket, runHash, sha256, type PilotRun, type ReviewFile, type Observation,
} from '../lib/evaluation/pilot'

async function main() {
  const { values } = parseArgs({ options: {
    live: { type: 'boolean' }, 'allow-paid-api': { type: 'boolean' },
    'max-cases': { type: 'string' }, results: { type: 'string' }, reviews: { type: 'string' },
    out: { type: 'string' },
  } })
  if (values.live && (values.results || values.reviews)) throw new Error('La ejecución real y la importación de resultados son pasos separados')
  if (!values.live && (values['allow-paid-api'] || values['max-cases'])) throw new Error('Los límites de API solo se usan con --live')
  if (values.reviews && !values.results) throw new Error('--reviews requiere --results')
  const { corpus, texts } = loadCorpus()
  const inputs = modelInputs(corpus, texts)
  const maxCases = Number(values['max-cases'])
  if (values.live && (!values['allow-paid-api'] || !Number.isInteger(maxCases) || maxCases < 1 || maxCases > inputs.length)) {
    throw new Error(`La API tiene coste: exige --allow-paid-api y --max-cases entre 1 y ${inputs.length}`)
  }
  const directory = resolve(values.out ?? (values.live ? `artifacts/pilot/run-${new Date().toISOString().replace(/[:.]/g, '-')}` : 'artifacts/pilot/prepared'))
  // Un run real conserva siempre su propio directorio; nunca sobrescribe otro run.
  if (values.live) mkdirSync(dirname(directory), { recursive: true })
  mkdirSync(directory, { recursive: !values.live })
  const writeJson = (name: string, value: unknown) => writeFileSync(join(directory, name), JSON.stringify(value, null, 2) + '\n')
  writeJson('corpus.json', corpus)
  writeFileSync(join(directory, 'inputs.jsonl'), inputs.map(input => JSON.stringify(input)).join('\n') + '\n')
  writeFileSync(join(directory, 'review.md'), reviewPacket(corpus))
  let run: PilotRun | undefined = values.results ? JSON.parse(readFileSync(resolve(values.results), 'utf8')) : undefined
  const reviews: ReviewFile | undefined = values.reviews ? JSON.parse(readFileSync(resolve(values.reviews), 'utf8')) : undefined

  if (values.live) {
    // El modo offline no carga variables privadas, clientes de API ni conexiones de datos.
    const { loadEnvConfig } = await import('@next/env')
    loadEnvConfig(process.cwd())
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta ANTHROPIC_API_KEY; no se ha ejecutado el modelo')
    const { classifyDocument, analyzeImpact } = await import('../lib/claude')
    const codeFiles = ['lib/claude.ts', 'lib/analysis/validation.ts', 'lib/pipeline/run.ts', 'actions/evaluate-pilot.ts', 'lib/evaluation/pilot.ts', 'prompts/regtrack-clasificador.md', 'prompts/regtrack-impacto.md']
    const provenance = Object.fromEntries(codeFiles.map(file => [file, sha256(canonicalText(readFileSync(file, 'utf8')))]))
    provenance.gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    provenance.scope = 'Clasificación e impacto con los prompts existentes; sin metadatos BOE opcionales, persistencia, noticias ni entrega de alertas. alert = candidato con score >= 4.'
    provenance.models = [...readFileSync('lib/claude.ts', 'utf8').matchAll(/model:\s*'([^']+)'/g)].map(match => match[1]).join(', ')
    run = { schemaVersion: 1, mode: 'live', corpusHash: corpusHash(corpus), startedAt: new Date().toISOString(), finishedAt: null, provenance, observations: [] }
    writeJson('run.json', run)
    for (const input of inputs.slice(0, maxCases)) {
      const started = performance.now()
      const observation: Observation = { caseId: input.caseId, outcome: 'error', classification: null, impact: null, elapsedMs: 0 }
      try {
        const classification = await classifyDocument(input.titulo, input.texto)
        observation.classification = classification
        if (!classification.relevante) observation.outcome = 'discard'
        else {
          const impact = await analyzeImpact(input.titulo, input.texto, input.fuente)
          observation.impact = impact
          if (!impact) observation.error = 'Análisis incompleto o ilegible'
          else observation.outcome = impact.score_relevancia < 4 ? 'discard' : 'alert'
        }
      } catch (error) {
        if (error instanceof ReviewRequiredError) {
          observation.outcome = 'needs_review'
          observation.reviewReason = error.message
        } else observation.error = error instanceof Error ? error.message : 'Error de análisis'
      }
      observation.elapsedMs = Math.round(performance.now() - started)
      run.observations.push(observation)
      writeJson('run.json', run)
      console.log(`${input.caseId}: ${observation.outcome}`)
    }
    run.finishedAt = new Date().toISOString()
    writeJson('run.json', run)
  }
  const report = evaluatePilot(corpus, run, reviews)
  writeJson('report.json', report)
  writeFileSync(join(directory, 'report.md'), reportMarkdown(report))
  if (run) {
    const template = join(directory, `reviews-template-${runHash(run).slice(0, 12)}.json`)
    if (!existsSync(template)) writeFileSync(template, JSON.stringify({ corpusHash: corpusHash(corpus), runHash: runHash(run), reviews: [] }, null, 2) + '\n', { flag: 'wx' })
  }
  console.log(`Piloto ${report.mode}: ${report.observedCases}/${report.totalCases} resultados; ${report.factualChecks.pending} comprobaciones pendientes. ${directory}`)
  if (report.errors.length) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'No se pudo preparar/evaluar el piloto')
  process.exitCode = 1
})
