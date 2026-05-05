import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }))
vi.mock('@/lib/embeddings', () => ({ generateEmbedding: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createServerClient: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: vi.fn() },
  })),
}))

import { POST } from '@/app/api/rag/chat/route'
import { getAuthUser } from '@/lib/auth'
import { generateEmbedding } from '@/lib/embeddings'
import { createServerClient } from '@/lib/supabase'

const fakeEmbedding = Array.from({ length: 1536 }, () => 0.1)
const fakeAlerta = {
  id: 'abc-123', titulo: 'Decreto alquiler', resumen: 'Resumen',
  fuente: 'BOE', subtema: 'arrendamiento', ambito: 'estatal',
  score_relevancia: 7, urgencia: 'alta', territorios: [],
  created_at: '2026-01-01T00:00:00Z', similarity: 0.9,
}

function makeRequest(body: object) {
  return { json: () => Promise.resolve(body) } as any
}

describe('POST /api/rag/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getAuthUser as any).mockResolvedValue({ id: 'user-1' })
    ;(generateEmbedding as any).mockResolvedValue(fakeEmbedding)
    ;(createServerClient as any).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [fakeAlerta], error: null }),
    })
  })

  it('devuelve 401 si no hay sesión', async () => {
    ;(getAuthUser as any).mockResolvedValue(null)
    const res = await POST(makeRequest({ query: 'alquiler', history: [] }))
    expect(res.status).toBe(401)
  })

  it('devuelve 400 si falta query', async () => {
    const res = await POST(makeRequest({ history: [] }))
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si query está vacía', async () => {
    const res = await POST(makeRequest({ query: '', history: [] }))
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si history no es array', async () => {
    const res = await POST(makeRequest({ query: 'alquiler', history: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('llama a generateEmbedding con la query', async () => {
    // Para este test, mockear stream para que no bloquee
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    ;(Anthropic as any).mockImplementation(() => ({
      messages: {
        stream: vi.fn().mockReturnValue((async function* () {})()),
      },
    }))
    await POST(makeRequest({ query: '¿qué hay de arrendamiento?', history: [] }))
    expect(generateEmbedding).toHaveBeenCalledWith('¿qué hay de arrendamiento?')
  })
})
