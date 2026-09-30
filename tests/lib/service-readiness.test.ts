import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkServices } from '@/lib/integrations/readiness'
import { withMcp } from '@/lib/integrations/mcp'

vi.mock('@/lib/integrations/mcp', () => ({ withMcp: vi.fn() }))
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetAllMocks() })

describe('preparación de servicios', () => {
  it('no presenta una configuración ausente como conexión correcta', async () => {
    expect((await checkServices({ vault: 'unused' })).map(c => c.status)).toEqual(['not_configured', 'not_configured', 'not_configured'])
  })
  it('no realiza peticiones si falta la clave', async () => {
    vi.stubEnv('REGTRACK_TEST_KEY', '')
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    const checks = await checkServices({ vault: 'unused', changedetection: { url: 'http://localhost:5000', tokenEnv: 'REGTRACK_TEST_KEY' } })
    expect(checks[0].status).toBe('credentials_missing')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('propaga el fallo de servicio sin exponer sus respuestas ni credenciales', async () => {
    vi.stubEnv('REGTRACK_TEST_KEY', 'secret-value')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret-response', { status: 503 })))
    const checks = await checkServices({ vault: 'unused', openAleph: { url: 'http://localhost:8080', tokenEnv: 'REGTRACK_TEST_KEY', collectionId: 1 } })
    expect(checks[1].status).toBe('failed')
    expect(JSON.stringify(checks)).not.toContain('secret')
  })
  it('Graphiti comprueba episodios sin llamar a extracción ni búsqueda de embeddings', async () => {
    const call = vi.fn().mockResolvedValue({ episodes: [] })
    vi.mocked(withMcp).mockImplementation(async (_endpoint, run) => run({ call }, {
      listTools: async () => ({ tools: ['add_memory', 'get_episodes', 'search_memory_facts'].map(name => ({ name, inputSchema: { type: 'object' as const } })) }),
    } as never))
    const checks = await checkServices({ vault: 'unused', graphiti: { groupId: 'test', mcp: { url: 'http://localhost:8000/mcp' } } })
    expect(checks[2].status).toBe('readable')
    expect(call).toHaveBeenCalledExactlyOnceWith('get_episodes', { group_ids: ['test'], max_episodes: 1 })
  })
})
