import { loadEnvConfig } from '@next/env'
import { scanDates } from '../lib/pipeline/dates'
import { runPipeline } from '../lib/pipeline/run'

loadEnvConfig(process.cwd())
const args = process.argv.slice(2)
Promise.resolve().then(() => runPipeline(scanDates(args), {
  scanOnly: args.includes('--scan-only'), memoryOnly: args.includes('--memory-only'), historical: args.includes('--from'),
})).then(report => {
  if (report.incomplete) process.exitCode = 1
}).catch(error => {
  console.error('[pipeline] Error fatal:', error)
  process.exitCode = 1
})
