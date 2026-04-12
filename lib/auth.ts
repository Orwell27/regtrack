// lib/auth.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createNextServerClient } from '@/lib/supabase'
import type { Rol, Plan } from '@/lib/supabase'

export type AuthUser = {
  authId: string
  email: string
  rol: Rol
  plan: Plan
  usuarioId: string
  nombre: string
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { session } } = await supabaseAuth.auth.getSession()
  if (!session) return null

  const db = createNextServerClient()
  const { data: usuario } = await db
    .from('usuarios')
    .select('id, rol, plan, nombre')
    .or(`auth_id.eq.${session.user.id},email.eq.${session.user.email}`)
    .single()

  if (!usuario) return null

  return {
    authId: session.user.id,
    email: session.user.email!,
    rol: usuario.rol as Rol,
    plan: usuario.plan as Plan,
    usuarioId: usuario.id,
    nombre: usuario.nombre,
  }
}
