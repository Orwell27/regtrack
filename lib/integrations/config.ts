import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type McpEndpoint = { command: string; args: string[]; env?: Record<string, string> } | { url: string; tokenEnv?: string }
export interface IntegrationConfig {
  vault: string
  basicMemory?: { project: string; mcp: McpEndpoint }
  mcpBoe?: { mcp: McpEndpoint }
  graphiti?: { groupId: string; mcp: McpEndpoint }
  openAleph?: { url: string; collectionId: number; tokenEnv: string }
  changedetection?: { url: string; tokenEnv: string }
}

export function endpointUrl(value: string): URL {
  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) throw new Error('Endpoint inválido')
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Un servicio remoto debe usar HTTPS')
  return url
}

export function secret(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable ${name}`)
  return value
}

export function readConfig(path = process.env.REGTRACK_INTEGRATIONS_CONFIG): IntegrationConfig {
  const v = path ? JSON.parse(readFileSync(resolve(path), 'utf8')) as IntegrationConfig : { vault: process.env.REGTRACK_KNOWLEDGE_DIR || '.knowledge/vault' }
  if (!v.vault || typeof v.vault !== 'string') throw new Error('La configuración necesita vault')
  for (const service of [v.basicMemory, v.mcpBoe, v.graphiti]) {
    if (!service) continue
    const mcp = service.mcp
    if (!mcp) throw new Error('Falta configuración MCP')
    if ('url' in mcp) endpointUrl(mcp.url)
    else if (!mcp.command || !Array.isArray(mcp.args) || mcp.args.some(a => typeof a !== 'string') || (mcp.env && Object.values(mcp.env).some(a => typeof a !== 'string'))) throw new Error('Comando MCP inválido')
  }
  if (v.basicMemory && !v.basicMemory.project) throw new Error('Basic Memory necesita un proyecto dedicado')
  if (v.graphiti && !/^[a-zA-Z0-9_-]+$/.test(v.graphiti.groupId)) throw new Error('Graphiti necesita groupId válido')
  if (v.openAleph) {
    endpointUrl(v.openAleph.url)
    if (!Number.isSafeInteger(v.openAleph.collectionId) || v.openAleph.collectionId < 1) throw new Error('OpenAleph necesita collectionId')
  }
  if (v.changedetection) endpointUrl(v.changedetection.url)
  return v
}
