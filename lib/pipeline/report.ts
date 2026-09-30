import { appendFileSync, mkdirSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { NormalizedItem } from '../sources/boe'
import { SourceAccessBlockedError } from '../sources/http'
import type { ImpactResult } from '../analysis/validation'

export interface SourceResult {
  source: string
  scope: string
  status: 'ok' | 'empty' | 'error'
  count: number
  error?: string
}
export interface Decision {
  url: string
  source: string
  title: string
  status: 'saved' | 'discarded' | 'low_score' | 'error' | 'existing' | 'unprocessed' | 'needs_review'
  reason: string
  analysis?: ImpactResult
}

export class ScanReport {
  startedAt = new Date().toISOString()
  sources: SourceResult[] = []
  decisions: Decision[] = []
  fatal: string[] = []
  mode: 'full' | 'sources_only' = 'full'
  finished = false
  private blockedSources = new Map<string, string>()
  constructor(public dates: string[]) {}

  blockSource(source: string, reason: string) { this.blockedSources.set(source, reason) }
  blockedReason(source: string) { return this.blockedSources.get(source) }

  async source(source: string, scope: string, fetcher: () => Promise<NormalizedItem[]>): Promise<NormalizedItem[]> {
    const previousBlock = this.blockedReason(source)
    if (previousBlock) {
      this.sources.push({ source, scope, status: 'error', count: 0, error: `Sin reintento en esta ejecución: ${previousBlock}` })
      return []
    }
    try {
      const items = await fetcher()
      this.sources.push({ source, scope, status: items.length ? 'ok' : 'empty', count: items.length })
      return items
    } catch (error) {
      if (error instanceof SourceAccessBlockedError) this.blockSource(source, error.message)
      this.sources.push({ source, scope, status: 'error', count: 0, error: error instanceof Error ? error.message : String(error) })
      return []
    }
  }

  decision(item: NormalizedItem, status: Decision['status'], reason: string, analysis?: ImpactResult) {
    const decision = { url: item.url, source: item.fuente, title: item.titulo, status, reason, ...(analysis ? { analysis } : {}) }
    const index = this.decisions.findIndex(d => d.url === item.url)
    if (index === -1) this.decisions.push(decision)
    else this.decisions[index] = decision
  }

  get incomplete() {
    return this.fatal.length > 0 || this.sources.some(s => s.status === 'error') || this.decisions.some(d => ['error', 'unprocessed', 'needs_review'].includes(d.status))
  }

  save(directory = 'artifacts', publishSummary = false) {
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, 'scan-report.json.tmp'), JSON.stringify({
      startedAt: this.startedAt, finishedAt: this.finished ? new Date().toISOString() : null, dates: this.dates,
      mode: this.mode, status: !this.finished ? 'running' : this.incomplete ? 'incomplete' : 'completed', sources: this.sources, decisions: this.decisions, fatal: this.fatal,
    }, null, 2))
    renameSync(join(directory, 'scan-report.json.tmp'), join(directory, 'scan-report.json'))
    const escape = (text: string) => text.replace(/[|\r\n]/g, ' ')
    const summary = [
      '# Vigilancia RegTrack',
      this.mode === 'sources_only' ? 'Modo: **solo fuentes; no se ha evaluado ni guardado ninguna alerta**.' : 'Modo: fuentes y procesamiento de documentos.',
      `Resultado: **${!this.finished ? 'EN CURSO — resultado aún no verificado' : this.incomplete ? 'INCOMPLETA — revisar pendientes y errores' : 'Finalizada; revisar fuentes sin resultados'}**`,
      `BOE/BORM: ${this.dates[0]} a ${this.dates.at(-1)}. Otras fuentes: contenido reciente disponible, sin garantía de recuperación histórica.`,
      '', '| Fuente | Periodo | Estado | Documentos |', '|---|---|---|---|',
      ...this.sources.map(s => `| ${s.source} | ${s.scope} | ${s.status === 'empty' ? 'Sin resultados; no prueba ausencia de novedades' : s.status} | ${s.count} |`),
      '', `Guardadas: ${this.decisions.filter(d => d.status === 'saved').length}. Pendientes por error: ${this.decisions.filter(d => d.status === 'error' || d.status === 'unprocessed').length}.`,
      `Pendientes de texto o revisión documental: ${this.decisions.filter(d => d.status === 'needs_review').length}.`,
      ...this.sources.filter(s => s.error).map(s => `- ${s.source}: ${escape(s.error!)}`),
      ...this.fatal.map(e => `- ${escape(e)}`),
      '', 'El JSON adjunto incluye también descartes y motivos. Una ejecución correcta no demuestra cobertura jurídica completa.',
    ].join('\n') + '\n'
    writeFileSync(join(directory, 'scan-summary.md'), summary)
    if (publishSummary && process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
  }
}
