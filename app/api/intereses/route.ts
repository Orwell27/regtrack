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

  const body = await req.json() as { subcategoria_ids: number[] }
  if (!Array.isArray(body.subcategoria_ids)) {
    return NextResponse.json({ error: 'subcategoria_ids debe ser un array' }, { status: 400 })
  }

  const db = createNextServerClient()

  await db.from('suscriptor_intereses').delete().eq('usuario_id', user.usuarioId)

  if (body.subcategoria_ids.length > 0) {
    await db.from('suscriptor_intereses').insert(
      body.subcategoria_ids.map(id => ({ usuario_id: user.usuarioId, subcategoria_id: id }))
    )
  }

  return NextResponse.json({ ok: true })
}
