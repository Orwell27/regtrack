import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { withMcp } from '../lib/integrations/mcp'

// Only discover tools and read episodes. Never invoke extraction, search or embeddings.
async function main() {
  const result = await withMcp({ url: 'http://127.0.0.1:8000/mcp' }, async (client, sdk) => {
    const names = (await sdk.listTools()).tools.map(t => t.name).sort()
    for (const name of ['add_memory', 'get_episodes', 'search_memory_facts']) assert(names.includes(name), `Falta herramienta ${name}`)
    const data = await client.call('get_episodes', { group_ids: ['regtrack'], max_episodes: 10 })
    const episodes = Array.isArray(data) ? data : (data as { episodes?: unknown[] })?.episodes
    assert(Array.isArray(episodes), 'Respuesta de episodios no reconocida')
    return { status: 'readable', at: new Date().toISOString(), tools: names, episodeCount: episodes.length,
      modelCalls: 0, extractionVerified: false }
  })
  mkdirSync('artifacts/local-services', { recursive: true })
  writeFileSync('artifacts/local-services/graphiti-result.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
