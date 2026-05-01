// app/api/admin/subcategorias/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params

  let body: { activo: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  if (typeof body.activo !== 'boolean') {
    return NextResponse.json({ error: 'activo debe ser boolean' }, { status: 400 })
  }

  const subcatId = parseInt(id)
  if (isNaN(subcatId)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })

  const db = createNextServerClient()
  const { data, error } = await db
    .from('subcategorias')
    .update({ activo: body.activo })
    .eq('id', subcatId)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Subcategoría no encontrada' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
