import { secret, type IntegrationConfig } from './config'
import { withMcp } from './mcp'
import { ChangeDetection, OpenAleph } from './providers'

export interface ServiceCheck {
  service: 'changedetection' | 'openaleph' | 'graphiti'
  status: 'not_configured' | 'credentials_missing' | 'readable' | 'failed'
  detail: string
}

/** Read-only connectivity. Never imports documents or calls an embedding/LLM tool. */
export async function checkServices(config: IntegrationConfig): Promise<ServiceCheck[]> {
  const checks: ServiceCheck[] = []
  async function check(service: ServiceCheck['service'], configured: boolean, tokenEnv: string | undefined,
    run: () => Promise<unknown>, detail: string) {
    if (!configured) { checks.push({ service, status: 'not_configured', detail: 'Falta dirección/configuración del servicio' }); return }
    if (tokenEnv && !process.env[tokenEnv]) { checks.push({ service, status: 'credentials_missing', detail: `Falta variable ${tokenEnv}` }); return }
    try { await run(); checks.push({ service, status: 'readable', detail }) }
    catch { checks.push({ service, status: 'failed', detail: 'Falló la lectura autenticada o el contrato esperado; revisar servidor y credenciales. No acredita ausencia de novedades.' }) }
  }
  const cd = config.changedetection
  await check('changedetection', !!cd, cd?.tokenEnv, async () => {
    if (!cd) return
    const watches = await new ChangeDetection(cd.url, secret(cd.tokenEnv)).watches()
    if (!watches || typeof watches !== 'object' || Array.isArray(watches)) throw new Error('Listado inválido')
  }, 'API accesible. Comprobar cada monitor con pull-watch; esta lectura no verifica cobertura ni frescura.')
  const oa = config.openAleph
  await check('openaleph', !!oa, oa?.tokenEnv, async () => {
    if (!oa) return
    const status = await new OpenAleph(oa.url, secret(oa.tokenEnv), oa.collectionId).status()
    if (!status || typeof status !== 'object' || Array.isArray(status)) throw new Error('Estado inválido')
  }, 'Estado de colección accesible. Pendiente enviar un documento y recuperarlo por búsqueda para acreditar indexación.')
  const graph = config.graphiti
  await check('graphiti', !!graph, graph && 'url' in graph.mcp ? graph.mcp.tokenEnv : undefined, async () => {
    if (!graph) return
    await withMcp(graph.mcp, async (client, sdk) => {
      const names = new Set((await sdk.listTools()).tools.map(t => t.name))
      for (const name of ['add_memory', 'get_episodes', 'search_memory_facts']) if (!names.has(name)) throw new Error('Herramienta MCP ausente')
      await client.call('get_episodes', { group_ids: [graph.groupId], max_episodes: 1 })
    })
  }, 'Contrato MCP y lectura de episodios accesibles. No verifica extracción ni embeddings y no autoriza consumo de modelos.')
  return checks
}
