// app/api/inmuebles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { clasificar } from '@/lib/cartera/clasificar'
import { validarEntrada } from '@/lib/cartera/entrada'
import { geocodificar } from '@/lib/cartera/geocodificar'
import type { Inmueble } from '@/lib/cartera/tipos'

// Postgres 42P01 / PostgREST PGRST205: la tabla aún no existe
function faltaTabla(code: string | undefined) {
  return code === '42P01' || code === 'PGRST205'
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createNextServerClient()
  const { data, error } = await db
    .from('inmuebles')
    .select('*')
    .eq('usuario_id', user.usuarioId)
    .order('created_at')

  if (error) {
    if (faltaTabla(error.code)) {
      return NextResponse.json({ error: 'Falta aplicar la migración 009_inmuebles.sql en Supabase' }, { status: 503 })
    }
    console.error('[inmuebles] Error cargando cartera:', error.message)
    return NextResponse.json({ error: 'Error cargando la cartera' }, { status: 500 })
  }

  const inmuebles = (data ?? []) as Inmueble[]
  return NextResponse.json({
    inmuebles: inmuebles.map(i => ({ ...i, clasificacion: clasificar(i) })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const entrada = validarEntrada(body)
  if (!entrada.ok) return NextResponse.json({ error: entrada.error }, { status: 400 })

  const ubicacion = await geocodificar(entrada.datos.direccion)

  const db = createNextServerClient()
  const { data, error } = await db
    .from('inmuebles')
    .insert({
      ...entrada.datos,
      usuario_id: user.usuarioId,
      lat: ubicacion?.lat ?? null,
      lon: ubicacion?.lon ?? null,
      municipio_ine: ubicacion?.municipio_ine ?? null,
    })
    .select('*')
    .single()

  if (error) {
    if (faltaTabla(error.code)) {
      return NextResponse.json({ error: 'Falta aplicar la migración 009_inmuebles.sql en Supabase' }, { status: 503 })
    }
    console.error('[inmuebles] Error guardando:', error.message)
    return NextResponse.json({ error: 'No se pudo guardar el inmueble' }, { status: 500 })
  }

  const inmueble = data as Inmueble
  return NextResponse.json(
    { inmueble: { ...inmueble, clasificacion: clasificar(inmueble) }, ubicado: ubicacion !== null },
    { status: 201 }
  )
}
