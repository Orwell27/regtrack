// tests/lib/supabase.types.test.ts
import { describe, it, expectTypeOf } from 'vitest'
import type { Usuario } from '@/lib/supabase'

describe('Usuario type', () => {
  it('debe incluir campo rol', () => {
    expectTypeOf<Usuario['rol']>().toEqualTypeOf<'admin' | 'subscriber'>()
  })
  it('debe incluir auth_id', () => {
    expectTypeOf<Usuario['auth_id']>().toEqualTypeOf<string | null>()
  })
  it('debe incluir preferencias', () => {
    expectTypeOf<Usuario['preferencias']>().toEqualTypeOf<Record<string, unknown>>()
  })
})
