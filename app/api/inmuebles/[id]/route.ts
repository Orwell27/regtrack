// app/api/inmuebles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { clasificar } from '@/lib/cartera/clasificar'
import { validarEntrada } from '@/lib/cartera/entrada'
import { geocodificar } from '@/lib/cartera/geocodificar'
import type { Inmueble } from '@/lib/cartera/tipos'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const entrada = validarEntrada(body)
  if (!entrada.ok) return NextResponse.json({ error: entrada.error }, { status: 400 })

  const db = createNextServerClient()
  const { data: actual, error: errActual } = await db
    .from('inmuebles')
    .select('direccion, lat, lon, municipio_ine')
    .eq('id', id)
    .eq('usuario_id', user.usuarioId)
    .maybeSingle()

  if (errActual) return NextResponse.json({ error: 'Error cargando el inmueble' }, { status: 500 })
  if (!actual) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Solo se vuelve a situar en el mapa si cambia la dirección
  let ubicacion = { lat: actual.lat, lon: actual.lon, municipio_ine: actual.municipio_ine }
  if (actual.direccion !== entrada.datos.direccion) {
    const nueva = await geocodificar(entrada.datos.direccion)
    ubicacion = { lat: nueva?.lat ?? null, lon: nueva?.lon ?? null, municipio_ine: nueva?.municipio_ine ?? null }
  }

  const { data, error } = await db
    .from('inmuebles')
    .update({ ...entrada.datos, ...ubicacion, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('usuario_id', user.usuarioId)
    .select('*')
    .single()

  if (error) {
    console.error('[inmuebles] Error actualizando:', error.message)
    return NextResponse.json({ error: 'No se pudo guardar el inmueble' }, { status: 500 })
  }

  const inmueble = data as Inmueble
  return NextResponse.json({ inmueble: { ...inmueble, clasificacion: clasificar(inmueble) } })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params

  const db = createNextServerClient()
  const { error, count } = await db
    .from('inmuebles')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('usuario_id', user.usuarioId)

  if (error) return NextResponse.json({ error: 'No se pudo borrar el inmueble' }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
