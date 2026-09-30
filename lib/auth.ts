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

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  // getSession() devuelve la cookie tal cual, sin comprobar la firma del token,
  // y la cookie la puede escribir cualquiera. getClaims() verifica la firma.
  const { data, error } = await supabaseAuth.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null

  const db = createNextServerClient()
  const { data: usuario } = await db
    .from('usuarios')
    .select('id, rol, plan, nombre')
    .or(`auth_id.eq.${claims.sub},email.eq.${claims.email}`)
    .single()

  if (!usuario) return null

  return {
    authId: claims.sub,
    email: claims.email!,
    rol: usuario.rol as Rol,
    plan: usuario.plan as Plan,
    usuarioId: usuario.id,
    nombre: usuario.nombre,
  }
}

// Para las rutas de administración: devuelve la respuesta de rechazo
// (401 sin sesión, 403 si no es admin), o null si puede pasar.
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  return null
}
