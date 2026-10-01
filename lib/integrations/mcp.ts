import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { endpointUrl, secret, type McpEndpoint } from './config'

export interface ToolClient {
  call(name: string, args: Record<string, unknown>): Promise<unknown>
}

export function unwrapToolResult(value: unknown): unknown {
  const result = value as { isError?: boolean; structuredContent?: unknown; content?: { type: string; text?: string }[] }
  if (result.isError) throw new Error('El servidor MCP rechazó la operación; revisar sus registros')
  const text = result.content?.filter(c => c.type === 'text').map(c => c.text ?? '').join('\n') ?? ''
  let data = result.structuredContent
  if (data === undefined) {
    try { data = JSON.parse(text) } catch { data = text }
  }
  // FastMCP envuelve retornos escalares en { result: ... }.
  if (data && typeof data === 'object' && Object.keys(data).length === 1 && 'result' in data) {
    data = (data as { result: unknown }).result
    if (typeof data === 'string') { try { data = JSON.parse(data) } catch { /* texto ordinario */ } }
  }
  const obj = data && typeof data === 'object' ? data as Record<string, unknown> : undefined
  if (obj?.error || obj?.success === false || obj?.status === 'error' || /^(?:Error\b|❌|ERROR\b)/m.test(typeof data === 'string' ? data : text)) throw new Error('El servicio devolvió un error de aplicación')
  return data
}

export async function withMcp<T>(endpoint: McpEndpoint, operation: (client: ToolClient, sdk: Client) => Promise<T>): Promise<T> {
  const client = new Client({ name: 'regtrack-integrations', version: '1.0.0' })
  const transport = 'url' in endpoint
    ? new StreamableHTTPClientTransport(endpointUrl(endpoint.url), { requestInit: { redirect: 'error', headers: endpoint.tokenEnv ? { Authorization: `Bearer ${secret(endpoint.tokenEnv)}` } : {} } })
    : new StdioClientTransport({ command: endpoint.command, args: endpoint.args,
      // No transferir credenciales de Supabase/Anthropic a procesos auxiliares.
      env: { ...getDefaultEnvironment(), ...endpoint.env }, stderr: 'inherit',
    })
  try {
    await client.connect(transport, { timeout: 60_000 })
    return await operation({ call: async (name, args) => unwrapToolResult(await client.callTool({ name, arguments: args }, undefined, { timeout: 60_000 })) }, client)
  } finally { await client.close() }
}
