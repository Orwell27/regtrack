// tests/lib/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

// Mock de next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}))

// Mock de lib/supabase
vi.mock('@/lib/supabase', () => ({
  createNextServerClient: vi.fn(),
}))

import { createServerClient } from '@supabase/ssr'
import { createNextServerClient } from '@/lib/supabase'

describe('getAuthUser', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('devuelve null si no hay sesión', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    } as never)

    const { getAuthUser } = await import('@/lib/auth')
    const result = await getAuthUser()
    expect(result).toBeNull()
  })

  it('devuelve null si el usuario no está en la tabla usuarios', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'uuid-1', email: 'a@b.com' } } },
      })},
    } as never)
    vi.mocked(createNextServerClient).mockReturnValue({
      from: () => ({ select: () => ({ or: () => ({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }),
    } as never)

    const { getAuthUser } = await import('@/lib/auth')
    const result = await getAuthUser()
    expect(result).toBeNull()
  })

  it('devuelve AuthUser con rol admin', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'uuid-1', email: 'admin@test.com' } } },
      })},
    } as never)
    vi.mocked(createNextServerClient).mockReturnValue({
      from: () => ({ select: () => ({ or: () => ({ single: vi.fn().mockResolvedValue({
        data: { id: 'u-1', rol: 'admin', plan: 'pro', nombre: 'Admin' },
      }) }) }) }),
    } as never)

    const { getAuthUser } = await import('@/lib/auth')
    const result = await getAuthUser()
    expect(result).toMatchObject({ rol: 'admin', email: 'admin@test.com' })
  })
})
