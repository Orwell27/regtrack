import { mkdirSync, writeFileSync, appendFileSync } from 'fs'
import { assessSchedule, type ScheduledRun } from '../lib/pipeline/schedule'

async function get(path: string) {
  const token = process.env.GITHUB_TOKEN
  const response = await fetch(`https://api.github.com/repos/Orwell27/regtrack/${path}`, {
    headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}; no se pudo verificar la continuidad`)
  return response.json()
}

async function run() {
  const [workflow, result] = await Promise.all([
    get('actions/workflows/pipeline.yml'), get('actions/workflows/pipeline.yml/runs?event=schedule&per_page=5'),
  ])
  const currentRunId = process.env.GITHUB_RUN_ID ? Number(process.env.GITHUB_RUN_ID) : undefined
  const report = assessSchedule(workflow.state, result.workflow_runs as ScheduledRun[], new Date(), currentRunId)
  mkdirSync('artifacts', { recursive: true })
  writeFileSync('artifacts/schedule-health.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) {
    const message = report.problems.join('; ')
    if (process.env.GITHUB_ACTIONS) console.log(`::warning::Continuidad: ${message}`)
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n## Continuidad pendiente\n${message}. No implica que el intervalo perdido se haya recuperado.\n`)
    // Dentro del pipeline se informa pero se permite recuperar; fuera sirve como comprobación para un monitor independiente.
    if (!process.argv.includes('--warn-only')) process.exitCode = 1
  }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
