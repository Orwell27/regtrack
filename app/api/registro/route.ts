import { NextResponse } from 'next/server'
import { rejectForeignOrigin, verifiedIdentity } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { REGIONS } from '@/lib/community/model'
export async function POST(request: Request) {
  const rejected = rejectForeignOrigin(request)
  if (rejected) return rejected
  const user = await verifiedIdentity()
  if (!user) return NextResponse.json({error:'Confirma tu correo y accede antes de completar el perfil.'},{status:401})
  let raw: Record<string, unknown>
  try { raw = await request.json() } catch { return NextResponse.json({error:'Formulario no válido'},{status:400}) }
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return NextResponse.json({error:'Formulario no válido'},{status:400})
  const profile = { nombre: typeof raw.nombre === 'string' ? raw.nombre.trim() : '', territorio: raw.territorio, subtema: raw.subtema, perfil: raw.perfil }
  if (profile.nombre.length < 2 || profile.nombre.length > 100 || ![...REGIONS, 'Nacional'].includes(profile.territorio as never) ||
    !['urbanismo','fiscalidad','arrendamiento','hipotecas','obra_nueva','construccion','rehabilitacion'].includes(String(profile.subtema)) ||
    !['promotor','agencia','despacho','inversor','propietario'].includes(String(profile.perfil))) return NextResponse.json({error:'Revisa los campos del perfil.'},{status:400})
  const {error} = await createNextServerClient().rpc('register_subscriber',{actor:user.id,profile})
  if(error) return NextResponse.json({error: error.message === 'CONFLICT' ? 'Tu perfil necesita revisión del equipo antes de vincularlo.' : 'No se ha podido completar el perfil.'},{status:error.message === 'CONFLICT' ? 409 : error.message === 'FORBIDDEN' ? 403 : 503})
  return NextResponse.json({ok:true})
}
