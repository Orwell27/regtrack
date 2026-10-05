// lib/auth.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
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

export async function verifiedIdentity() {
  const cookieStore = await cookies()

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: values => {
        try { values.forEach(({name,value,options}) => cookieStore.set(name,value,options)) }
        catch { /* Server Components rely on middleware to refresh cookies. */ }
      },
    } }
  )

  const { data, error } = await supabaseAuth.auth.getUser()
  if (error || !data.user?.email || !data.user.email_confirmed_at || data.user.is_anonymous) return null
  return data.user
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const identity = await verifiedIdentity()
  if (!identity) return null

  const db = createNextServerClient()
  const { data: usuario, error } = await db
    .from('usuarios')
    .select('id, rol, plan, nombre, activo')
    .eq('auth_id', identity.id)
    .maybeSingle()

  if (error || !usuario?.activo || !['admin','subscriber'].includes(usuario.rol) || !['free','pro'].includes(usuario.plan)) return null

  return {
    authId: identity.id,
    email: identity.email!,
    rol: usuario.rol as Rol,
    plan: usuario.plan as Plan,
    usuarioId: usuario.id,
    nombre: usuario.nombre,
  }
}

export async function requireAdmin() {
  const user = await getAuthUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  if (user.rol !== 'admin') return { user: null, error: NextResponse.json({ error: 'Acceso de administrador requerido' }, { status: 403 }) }
  return { user, error: null }
}

export function rejectForeignOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.COMMUNITY_SITE_URL
  const origin = configured ? new URL(configured).origin : new URL(request.url).origin
  return request.headers.get('origin') === origin ? null : NextResponse.json({ error: 'Origen no válido' }, { status: 403 })
}
