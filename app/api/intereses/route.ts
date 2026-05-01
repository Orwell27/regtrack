// app/api/intereses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

type SubcategoriaRow = {
  id: number
  slug: string
  nombre: string
  sector_id: number
}

type SectorRow = {
  id: number
  nombre: string
  slug: string
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createNextServerClient()

  const [sectoresRes, subcatsRes, interesesRes] = await Promise.all([
    db.from('sectores').select('id, nombre, slug').eq('activo', true).order('nombre'),
    db.from('subcategorias').select('id, slug, nombre, sector_id').eq('activo', true).order('nombre'),
    db.from('suscriptor_intereses').select('subcategoria_id').eq('usuario_id', user.usuarioId),
  ])

  if (sectoresRes.error) {
    console.error('[intereses] Error cargando sectores:', sectoresRes.error.message)
    return NextResponse.json({ error: 'Error cargando datos' }, { status: 500 })
  }
  if (subcatsRes.error) {
    console.error('[intereses] Error cargando subcategorias:', subcatsRes.error.message)
    return NextResponse.json({ error: 'Error cargando datos' }, { status: 500 })
  }

  const sectores = (sectoresRes.data ?? []) as SectorRow[]
  const subcats = (subcatsRes.data ?? []) as SubcategoriaRow[]
  const interesIds = new Set((interesesRes.data ?? []).map(i => i.subcategoria_id))

  const result = sectores.map(sector => ({
    id: sector.id,
    nombre: sector.nombre,
    slug: sector.slug,
    subcategorias: subcats
      .filter(s => s.sector_id === sector.id)
      .map(s => ({
        id: s.id,
        slug: s.slug,
        nombre: s.nombre,
        seleccionado: interesIds.has(s.id),
      })),
  }))

  return NextResponse.json({ sectores: result })
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.plan !== 'pro') return NextResponse.json({ error: 'Plan Pro requerido' }, { status: 403 })

  let body: { subcategoria_ids: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  if (!Array.isArray(body.subcategoria_ids)) {
    return NextResponse.json({ error: 'subcategoria_ids debe ser un array' }, { status: 400 })
  }

  const ids = body.subcategoria_ids
  if (!ids.every((x: unknown) => Number.isInteger(x))) {
    return NextResponse.json({ error: 'subcategoria_ids debe contener solo enteros' }, { status: 400 })
  }

  const db = createNextServerClient()

  const { error: deleteError } = await db
    .from('suscriptor_intereses')
    .delete()
    .eq('usuario_id', user.usuarioId)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (ids.length > 0) {
    const { error: insertError } = await db
      .from('suscriptor_intereses')
      .insert((ids as number[]).map(id => ({ usuario_id: user.usuarioId, subcategoria_id: id })))
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
