// app/api/admin/grupos-telegram/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { sendMessage } from '@/lib/telegram'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const db = createNextServerClient()
  const { data, error } = await db
    .from('telegram_grupos')
    .select('id, nombre, chat_id, invite_link, activo, subcategorias(id, nombre, slug)')
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: { nombre: string; chat_id: string; subcategoria_id: number; invite_link?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  if (!body.nombre?.trim() || !body.chat_id?.trim() || body.subcategoria_id == null) {
    return NextResponse.json({ error: 'Faltan campos requeridos: nombre, chat_id, subcategoria_id' }, { status: 400 })
  }

  if (!Number.isInteger(body.subcategoria_id)) {
    return NextResponse.json({ error: 'subcategoria_id debe ser un entero' }, { status: 400 })
  }

  const db = createNextServerClient()
  const { data, error } = await db
    .from('telegram_grupos')
    .insert({
      nombre: body.nombre.trim(),
      chat_id: body.chat_id.trim(),
      subcategoria_id: body.subcategoria_id,
      invite_link: body.invite_link ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send verification message to the group (non-blocking)
  sendMessage(
    body.chat_id,
    '✅ Grupo configurado en RegTrack. Las alertas de esta subcategoría se publicarán aquí.',
    'Markdown'
  ).catch(err => console.error('[grupos-telegram] Error enviando verificación:', err))

  return NextResponse.json({ ok: true, id: data.id })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const idParam = searchParams.get('id')
  if (!idParam) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const id = parseInt(idParam)
  if (isNaN(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })

  const db = createNextServerClient()
  const { data, error } = await db
    .from('telegram_grupos')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
