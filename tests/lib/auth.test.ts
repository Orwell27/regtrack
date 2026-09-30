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

function mockUsuario(data: unknown) {
  vi.mocked(createNextServerClient).mockReturnValue({
    from: () => ({ select: () => ({ or: () => ({ single: vi.fn().mockResolvedValue({ data }) }) }) }),
  } as never)
}

describe('getAuthUser', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('devuelve null si no hay sesión', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getClaims: vi.fn().mockResolvedValue({ data: null, error: null }) },
    } as never)

    const { getAuthUser } = await import('@/lib/auth')
    const result = await getAuthUser()
    expect(result).toBeNull()
  })

  it('devuelve null si el usuario no está en la tabla usuarios', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getClaims: vi.fn().mockResolvedValue({
        data: { claims: { sub: 'uuid-1', email: 'a@b.com' } }, error: null,
      })},
    } as never)
    mockUsuario(null)

    const { getAuthUser } = await import('@/lib/auth')
    const result = await getAuthUser()
    expect(result).toBeNull()
  })

  it('devuelve AuthUser con rol admin', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getClaims: vi.fn().mockResolvedValue({
        data: { claims: { sub: 'uuid-1', email: 'admin@test.com' } }, error: null,
      })},
    } as never)
    mockUsuario({ id: 'u-1', rol: 'admin', plan: 'pro', nombre: 'Admin' })

    const { getAuthUser } = await import('@/lib/auth')
    const result = await getAuthUser()
    expect(result).toMatchObject({ rol: 'admin', email: 'admin@test.com', authId: 'uuid-1' })
  })

  // La cookie se puede escribir a mano: getSession() la devuelve tal cual,
  // sin comprobar la firma del token. Solo vale lo que verifica getClaims().
  it('devuelve null con una cookie falsificada aunque lleve el email de un admin', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'inventado', user: { id: 'x', email: 'admin@test.com' } } },
        }),
        getClaims: vi.fn().mockResolvedValue({ data: null, error: new Error('Invalid JWT signature') }),
      },
    } as never)
    mockUsuario({ id: 'u-1', rol: 'admin', plan: 'pro', nombre: 'Admin' })

    const { getAuthUser } = await import('@/lib/auth')
    expect(await getAuthUser()).toBeNull()
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  function sesion(rol: string | null) {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getClaims: vi.fn().mockResolvedValue(
        rol ? { data: { claims: { sub: 'uuid-1', email: 'a@b.com' } }, error: null } : { data: null, error: null }
      ) },
    } as never)
    mockUsuario(rol ? { id: 'u-1', rol, plan: 'free', nombre: 'X' } : null)
  }

  it('sin sesión devuelve un 401', async () => {
    sesion(null)
    const { requireAdmin } = await import('@/lib/auth')
    expect((await requireAdmin())?.status).toBe(401)
  })

  it('con sesión de suscriptor devuelve un 403', async () => {
    sesion('subscriber')
    const { requireAdmin } = await import('@/lib/auth')
    expect((await requireAdmin())?.status).toBe(403)
  })

  it('con sesión de admin devuelve null y deja pasar', async () => {
    sesion('admin')
    const { requireAdmin } = await import('@/lib/auth')
    expect(await requireAdmin()).toBeNull()
  })
})
