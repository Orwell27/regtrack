// app/api/cuenta/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createNextServerClient()
  const { data } = await db
    .from('usuarios')
    .select('nombre, email, telegram_id, plan, created_at')
    .eq('id', user.usuarioId)
    .single()

  if (!data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json() as Record<string, unknown>
  const allowed: Record<string, unknown> = {}

  if (typeof body.nombre === 'string' && body.nombre.trim()) {
    allowed.nombre = body.nombre.trim()
  }
  if (typeof body.telegram_id === 'string') {
    allowed.telegram_id = body.telegram_id.trim() || null
  }
  if (body.preferencias && typeof body.preferencias === 'object') {
    allowed.preferencias = body.preferencias
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 })
  }

  const db = createNextServerClient()
  const { error } = await db
    .from('usuarios')
    .update(allowed)
    .eq('id', user.usuarioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
