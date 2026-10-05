import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { requireAdmin, rejectForeignOrigin } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const originError = rejectForeignOrigin(request)
  if (originError) return originError
  const { id } = await params
  const body = await request.json()
  const db = createNextServerClient()

  const allowed: Record<string, unknown> = {}
  if (typeof body.activo === 'boolean') allowed.activo = body.activo
  if (body.plan === 'free' || body.plan === 'pro') allowed.plan = body.plan

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const { error } = await db.from('usuarios').update(allowed).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
