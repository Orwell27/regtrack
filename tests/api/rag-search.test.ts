import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(),
}))

import { GET } from '@/app/api/rag/search/route'
import { getAuthUser } from '@/lib/auth'
import { generateEmbedding } from '@/lib/embeddings'
import { createServerClient } from '@/lib/supabase'

const fakeEmbedding = Array.from({ length: 1536 }, () => 0.1)
const fakeAlerta = {
  id: 'abc-123',
  titulo: 'Decreto sobre alquiler',
  resumen: 'Regula contratos de alquiler',
  fuente: 'BOE',
  subtema: 'arrendamiento',
  ambito: 'estatal',
  score_relevancia: 7,
  urgencia: 'alta',
  territorios: [],
  created_at: '2026-01-01T00:00:00Z',
  similarity: 0.92,
}

function makeRequest(q: string) {
  const url = new URL(`http://localhost/api/rag/search?q=${encodeURIComponent(q)}`)
  return { nextUrl: { searchParams: url.searchParams } } as any
}

describe('GET /api/rag/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getAuthUser as any).mockResolvedValue({ id: 'user-1', rol: 'subscriber' })
    ;(generateEmbedding as any).mockResolvedValue(fakeEmbedding)
    ;(createServerClient as any).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [fakeAlerta], error: null }),
    })
  })

  it('devuelve 401 si no hay sesión', async () => {
    ;(getAuthUser as any).mockResolvedValue(null)
    const res = await GET(makeRequest('alquiler'))
    expect(res.status).toBe(401)
  })

  it('devuelve 400 si q es menor de 3 caracteres', async () => {
    const res = await GET(makeRequest('ab'))
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si q supera 200 caracteres', async () => {
    const res = await GET(makeRequest('a'.repeat(201)))
    expect(res.status).toBe(400)
  })

  it('devuelve resultados con similarity cuando la query es válida', async () => {
    const res = await GET(makeRequest('normativa sobre alquiler'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(1)
    expect(body.results[0].similarity).toBe(0.92)
  })

  it('llama a generateEmbedding con la query exacta', async () => {
    await GET(makeRequest('arrendamiento urbano'))
    expect(generateEmbedding).toHaveBeenCalledWith('arrendamiento urbano')
  })

  it('devuelve 503 si generateEmbedding lanza un error', async () => {
    ;(generateEmbedding as any).mockRejectedValue(new Error('OpenAI unavailable'))
    const res = await GET(makeRequest('normativa sobre alquiler'))
    expect(res.status).toBe(503)
  })
})
