import { beforeEach, describe, it, expect, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  CommunityError,
  parseCommand,
  safeReturnPath,
} from '@/lib/community/model'
const mock = vi.hoisted(() => ({
  identity: vi.fn(),
  execute: vi.fn(),
  config: vi.fn(),
}))
vi.mock('@/lib/community/server', () => ({
  communityIdentity: mock.identity,
  communityExecute: mock.execute,
  communityConfig: mock.config,
}))
import { GET, POST } from '@/app/api/comunidad/route'
const origin = 'https://regtrack.example'
function post(data: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request(`${origin}/api/comunidad`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', ...headers },
      body: JSON.stringify(data),
    }),
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  mock.identity.mockResolvedValue({ id: 'verified-user' })
  mock.execute.mockResolvedValue({ ok: true })
  mock.config.mockReturnValue({
    enabled: true,
    controller: 'Local test',
    contact: 'test@example.test',
  })
  vi.stubEnv('SUPABASE_SERVICE_KEY', 'local-test-secret')
})
describe('community API trust boundaries', () => {
  it('rejects cross-origin and missing Origin requests before executing a command', async () => {
    expect(
      (await post({}, { origin: 'https://attacker.example' })).status,
    ).toBe(403)
    expect(
      (
        await POST(
          new Request(`${origin}/api/comunidad`, {
            method: 'POST',
            body: '{}',
          }),
        )
      ).status,
    ).toBe(403)
    expect(mock.execute).not.toHaveBeenCalled()
  })
  it('rejects oversized streamed bodies and malformed JSON', async () => {
    expect((await post({ body: 'x'.repeat(18001) })).status).toBe(413)
    expect(
      (
        await POST(
          new Request(`${origin}/api/comunidad`, {
            method: 'POST',
            headers: { origin, 'content-type': 'application/json' },
            body: 'not json',
          }),
        )
      ).status,
    ).toBe(400)
    expect(mock.execute).not.toHaveBeenCalled()
  })
  it('requires a verified identity for writes and ignores client actor fields', async () => {
    const data = {
      action: 'follow',
      topic_id: randomUUID(),
      request_id: randomUUID(),
      enabled: true,
      actor: 'forged-admin',
    }
    mock.identity.mockResolvedValueOnce(null)
    expect((await post(data)).status).toBe(401)
    expect((await post(data)).status).toBe(200)
    expect(mock.execute).toHaveBeenCalledWith('verified-user', 'follow', {
      topic_id: data.topic_id,
      request_id: data.request_id,
      enabled: true,
    })
  })
  it('maps permission and stale-write errors without exposing backend details', async () => {
    mock.execute.mockRejectedValueOnce(
      new CommunityError(403, 'Acceso denegado'),
    )
    expect(
      (await GET(new Request(`${origin}/api/comunidad?action=admin`))).status,
    ).toBe(403)
    mock.execute.mockRejectedValueOnce(
      new Error('private table and secret value'),
    )
    const r = await GET(new Request(`${origin}/api/comunidad`))
    expect(r.status).toBe(503)
    expect(await r.text()).not.toContain('secret')
  })
  it('does not cache personal responses', async () => {
    const r = await GET(new Request(`${origin}/api/comunidad`))
    expect(r.headers.get('cache-control')).toContain('no-store')
    expect(r.headers.get('vary')).toBe('Cookie')
  })
  it('limits public submission data and hashes the rate-limit address', async () => {
    const data = {
      action: 'apply',
      email: 'Owner@Example.test',
      alias: 'Ana',
      region: 'Galicia',
      owner_kind: 'Vivienda habitual',
      need: '',
      consent: true,
      status: 'approved',
    }
    expect(
      (await post(data, { 'x-vercel-forwarded-for': '192.0.2.5' })).status,
    ).toBe(200)
    const [actor, command, payload, key] = mock.execute.mock.calls[0]
    expect(actor).toBeNull()
    expect(command).toBe('apply')
    expect(payload.email).toBe('owner@example.test')
    expect(payload.status).toBeUndefined()
    expect(key).toMatch(/^[a-f0-9]{64}$/)
    expect(key).not.toContain('192.0.2.5')
    mock.config.mockReturnValue({ enabled: true, controller: '', contact: '' })
    expect((await post(data)).status).toBe(503)
  })
  it('limits the query page to a bounded integer', async () => {
    await GET(new Request(`${origin}/api/comunidad?page=2.8`))
    expect(mock.execute.mock.calls[0][2].page).toBe(2)
    await GET(new Request(`${origin}/api/comunidad?page=Infinity`))
    expect(mock.execute.mock.calls[1][2].page).toBe(1000)
  })
})
describe('community input rules', () => {
  it('rejects unsafe links and requires professional attribution', () => {
    const reply = {
      action: 'reply',
      request_id: randomUUID(),
      topic_id: randomUUID(),
      body: 'Una aportación suficientemente concreta',
      kind: 'fuente',
    }
    for (const source_url of [
      'javascript:alert(1)',
      'data:text/html,test',
      'https://user:password@example.test',
      '',
    ])
      expect(() => parseCommand({ ...reply, source_url })).toThrow()
    expect(() =>
      parseCommand({ ...reply, kind: 'profesional', affiliation: '' }),
    ).toThrow()
  })
  it('requires explicit consent, valid territories and known commands', () => {
    const a = {
      action: 'apply',
      email: 'a@example.test',
      alias: 'Ana',
      region: 'Galicia',
      owner_kind: 'Vivienda habitual',
    }
    expect(() => parseCommand(a)).toThrow()
    expect(() => parseCommand({ ...a, consent: 'true' })).toThrow()
    expect(() =>
      parseCommand({ ...a, consent: true, region: 'inventado' }),
    ).toThrow()
    expect(() =>
      parseCommand({ action: 'grant_admin', request_id: randomUUID() }),
    ).toThrow()
  })
  it('keeps login redirects within the community', () => {
    for (const path of [
      'https://evil.test',
      '//evil.test',
      '/comunidad\\evil',
      '/comunidad-evil',
      null,
    ])
      expect(safeReturnPath(path)).toBe('/')
    expect(safeReturnPath('/comunidad/preguntas')).toBe('/comunidad/preguntas')
  })
})
