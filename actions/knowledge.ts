import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { loadEnvConfig } from '@next/env'
import { KnowledgeVault } from '../lib/knowledge/vault'
import { toFtm } from '../lib/knowledge/ftm'
import { readConfig, secret, type McpEndpoint } from '../lib/integrations/config'
import { withMcp } from '../lib/integrations/mcp'
import { boeQuery, ChangeDetection, OpenAleph, pushBasicMemory, pushGraphiti } from '../lib/integrations/providers'
import { syncRecords } from '../lib/integrations/sync'

loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const { values: flags, positionals: args } = parseArgs({ allowPositionals: true, options: {
  config: { type: 'string' }, vault: { type: 'string' }, file: { type: 'string' }, query: { type: 'string' },
  from: { type: 'string' }, to: { type: 'string' }, 'as-of': { type: 'string' }, limit: { type: 'string', default: '20' },
  'allow-model-calls': { type: 'boolean', default: false }, save: { type: 'boolean', default: false },
} })
const output = (value: unknown) => console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
function required(value: string | undefined, name: string): string { if (!value) throw new Error(`Falta ${name}`); return value }
function needed<T>(value: T | undefined, name: string): T { if (!value) throw new Error(`${name}: sin configurar`); return value }

async function main() {
  const config = readConfig(flags.config)
  const vault = new KnowledgeVault(flags.vault || config.vault)
  const limit = Number(flags.limit)
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('--limit entre 1 y 100')
  const query = () => required(flags.query, '--query')
  const aleph = () => {
    const c = needed(config.openAleph, 'OpenAleph')
    return new OpenAleph(c.url, secret(c.tokenEnv), c.collectionId)
  }
  const changes = () => {
    const c = needed(config.changedetection, 'changedetection.io')
    return new ChangeDetection(c.url, secret(c.tokenEnv))
  }
  // El destino solo se persiste como hash; incluir la ruta/configuración del índice evita
  // reutilizar acuses de otro proyecto que utilice el mismo comando.
  const target = (mcp: McpEndpoint) => 'url' in mcp ? mcp.url : { command: mcp.command, args: mcp.args, env: mcp.env, root: vault.root }
  switch (args[0] ?? 'help') {
    case 'init': vault.init(); output({ vault: vault.root }); break
    case 'status': output({ vault: vault.root, versions: vault.list().length,
      latestRecords: vault.list({ latest: true }).length,
      integrations: { normativaCanaria: 'estructura adaptada', followTheMoney: 'exportador Document; validar con Python',
        basicMemory: config.basicMemory ? 'configurado; no comprobado' : 'sin configurar',
        openAleph: config.openAleph ? 'configurado; no comprobado' : 'sin configurar',
        graphiti: config.graphiti ? 'configurado; requiere permiso de consumo IA' : 'sin configurar',
        mcpBoe: config.mcpBoe ? 'configurado; no comprobado' : 'sin configurar',
        changedetection: config.changedetection ? 'configurado; no comprobado' : 'sin configurar' } }); break
    case 'ingest': output(vault.put(JSON.parse(readFileSync(required(flags.file, '--file'), 'utf8')))); break
    case 'ingest-report': {
      const report = JSON.parse(readFileSync(required(flags.file, '--file'), 'utf8'))
      if (!report.startedAt || !Array.isArray(report.sources) || !Array.isArray(report.decisions)) throw new Error('Informe de escaneo inválido')
      output(vault.put({ kind: 'reporte', title: `Escaneo ${report.startedAt}`, sourceUrl: `urn:regtrack:scan:${report.startedAt}`,
        publisher: 'RegTrack', observedAt: report.finishedAt || report.startedAt,
        content: JSON.stringify(report, null, 2), contentKind: 'derivado' })); break
    }
    case 'search': output(vault.search(query(), flags['as-of'])); break
    case 'history': {
      const id = required(args[1], 'ID de memoria')
      if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('ID de memoria inválido')
      output(vault.list({ asOf: flags['as-of'] }).filter(r => r.id === id)); break
    }
    case 'list': output(vault.list({ latest: true, asOf: flags['as-of'] }).map(r => ({ id: r.id, version: r.version, title: r.title, kind: r.kind, sourceUrl: r.sourceUrl, observedAt: r.observedAt, review: r.review, contentKind: r.contentKind }))); break
    case 'export-ftm': {
      const text = vault.list().map(r => JSON.stringify(toFtm(r))).join('\n') + '\n'
      if (flags.file) { writeFileSync(flags.file, text); output({ file: resolve(flags.file) }) } else process.stdout.write(text)
      break
    }
    case 'weekly': {
      const from = required(flags.from, '--from'), to = required(flags.to, '--to')
      if (![from, to].every(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d))) || from > to) throw new Error('Intervalo inválido')
      const records = vault.list().filter(r => r.kind !== 'reporte' && r.observedAt.slice(0, 10) >= from && r.observedAt.slice(0, 10) <= to)
      const distinct = new Set(records.map(r => r.id)).size
      output(vault.put({ kind: 'reporte', title: `Memoria ${from} a ${to}`, sourceUrl: `urn:regtrack:weekly:${from}:${to}`,
        publisher: 'RegTrack', observedAt: new Date().toISOString(), contentKind: 'derivado', relatedTo: [...new Set(records.map(r => r.id))],
        content: [`${distinct} documentos distintos; ${records.length} versiones conservadas.`,
          'Periodo de observación UTC. Todos pendientes de revisión. Cero registros no prueba ausencia de noticias o cambios.',
          ...records.map(r => `- ${r.title.replace(/[\r\n]/g, ' ')} | ${r.kind} | ${r.sourceUrl} | ${r.observedAt}`)].join('\n') })); break
    }
    case 'sync': {
      const provider = args[1]
      if (provider === 'basic-memory') {
        const c = needed(config.basicMemory, 'Basic Memory')
        output(await withMcp(c.mcp, client => syncRecords(vault, JSON.stringify({ provider, project: c.project, target: target(c.mcp) }), async record => {
          await pushBasicMemory(client, c.project, record); return { status: 'written' }
        }, { limit })))
      } else if (provider === 'openaleph') {
        const c = needed(config.openAleph, 'OpenAleph'), service = aleph()
        output(await syncRecords(vault, JSON.stringify({ provider, url: c.url, collection: c.collectionId }), r => service.push(r), { limit }))
      } else if (provider === 'graphiti') {
        if (!flags['allow-model-calls']) throw new Error('Graphiti requiere --allow-model-calls')
        const c = needed(config.graphiti, 'Graphiti')
        output(await withMcp(c.mcp, client => syncRecords(vault, JSON.stringify({ provider, group: c.groupId, target: target(c.mcp) }),
          r => pushGraphiti(client, c.groupId, r, true), { limit, include: r => !['analisis', 'reporte'].includes(r.kind) })))
      } else throw new Error('Proveedor: basic-memory, openaleph o graphiti')
      break
    }
    case 'search-basic': {
      const c = needed(config.basicMemory, 'Basic Memory')
      output(await withMcp(c.mcp, client => client.call('search_notes', { project: c.project, query: query(), page_size: limit }))); break
    }
    case 'search-aleph': output(await aleph().search(query())); break
    case 'aleph-status': output(await aleph().status()); break
    case 'search-graphiti': {
      if (!flags['allow-model-calls']) throw new Error('La búsqueda Graphiti puede consumir embeddings; requiere --allow-model-calls')
      const c = needed(config.graphiti, 'Graphiti')
      output(await withMcp(c.mcp, client => client.call('search_memory_facts', { query: query(), group_ids: [c.groupId], max_facts: limit }))); break
    }
    case 'graphiti-episodes': {
      const c = needed(config.graphiti, 'Graphiti')
      output(await withMcp(c.mcp, client => client.call('get_episodes', { group_ids: [c.groupId], max_episodes: limit }))); break
    }
    case 'boe': {
      const c = needed(config.mcpBoe, 'MCP-BOE'), law = required(args[1], 'BOE-ID')
      const result = await withMcp(c.mcp, client => boeQuery(client, law, flags.from, flags.to))
      if (flags.save) output(vault.put({ kind: 'analisis', title: `Consulta MCP-BOE ${law} ${flags.from ?? ''} ${flags.to ?? ''}`,
        sourceUrl: `https://www.boe.es/buscar/act.php?id=${law}`, publisher: 'MCP-BOE sobre BOE',
        observedAt: new Date().toISOString(), contentKind: 'derivado', content: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }))
      else output(result)
      break
    }
    case 'watches': output(await changes().watches()); break
    case 'pull-watch': {
      const id = required(args[1], 'watch-id'), snapshot = await changes().snapshots(id)
      const known = new Set(vault.list().filter(r => r.kind === 'cambio_web' && r.sourceUrl === snapshot.watch.url).map(r => r.observedAt))
      let saved = 0, remaining = 0
      for (const timestamp of snapshot.timestamps) {
        const observedAt = new Date(Number(timestamp) * 1000).toISOString()
        if (known.has(observedAt)) continue
        if (saved >= limit) { remaining++; continue }
        vault.put({ kind: 'cambio_web', title: snapshot.watch.title || snapshot.watch.url!, publisher: 'changedetection.io',
          sourceUrl: snapshot.watch.url, observedAt, contentKind: 'extracto', content: await snapshot.read(timestamp) }); saved++
      }
      output({ saved, remaining, note: 'Instantáneas de páginas; no equivalen a cambios normativos verificados.' }); break
    }
    case 'probe': {
      const provider = args[1]
      const c = provider === 'basic-memory' ? config.basicMemory : provider === 'mcp-boe' ? config.mcpBoe : provider === 'graphiti' ? config.graphiti : undefined
      output(await withMcp(needed(c, 'Proveedor MCP').mcp, async (_client, sdk) => (await sdk.listTools()).tools.map(t => ({ name: t.name, inputSchema: t.inputSchema })))); break
    }
    case 'snapshot': {
      const directory = required(flags.file, '--file (directorio de exportación)')
      mkdirSync(directory, { recursive: true })
      const records = vault.list()
      writeFileSync(join(directory, 'records.json'), JSON.stringify(records, null, 2))
      output({ records: records.length, directory: resolve(directory), note: 'Exportación de contenido; para respaldo completo copiar el vault con .records y .receipts.' }); break
    }
    default: output('knowledge: init | status | ingest --file ficha.json | ingest-report --file scan-report.json | search --query texto [--as-of ISO] | list | weekly --from YYYY-MM-DD --to YYYY-MM-DD | export-ftm --file entities.ftm.jsonl | sync basic-memory|openaleph|graphiti [--limit 20] | search-basic|search-aleph|search-graphiti --query texto | aleph-status | graphiti-episodes | boe BOE-ID [--from fecha --to fecha] [--save] | watches | pull-watch ID | probe basic-memory|mcp-boe|graphiti. Configuración: --config archivo.json. Graphiti exige --allow-model-calls.')
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
