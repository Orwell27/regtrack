import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  communityConfig,
  communityExecute,
  communityIdentity,
} from '@/lib/community/server'
import { CommunityError, parseCommand } from '@/lib/community/model'
import { isCommunityOrigin } from '@/lib/community/origin'

export const dynamic = 'force-dynamic'
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
    },
  })
function failure(error: unknown) {
  return error instanceof CommunityError
    ? response({ error: error.message }, error.status)
    : response(
        { error: 'No hemos podido completar la petición. Inténtalo de nuevo.' },
        503,
      )
}

export async function POST(request: Request) {
  try {
    if (!isCommunityOrigin(request))
      throw new CommunityError(403, 'Envía el formulario desde RegTrack.')
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      throw new CommunityError(415, 'Formato no válido.')
    const reader = request.body?.getReader()
    if (!reader) throw new CommunityError(400, 'Falta el formulario.')
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 18000) {
          await reader.cancel()
          throw new CommunityError(413, 'El mensaje es demasiado largo.')
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
    const body = Buffer.concat(chunks).toString('utf8')
    let input: unknown
    try {
      input = JSON.parse(body)
    } catch {
      throw new CommunityError(400, 'No se ha podido leer el formulario.')
    }
    const { action, payload } = parseCommand(input)
    if (action === 'apply') {
      const config = communityConfig()
      if (!config.controller || !config.contact)
        throw new CommunityError(503, 'Las solicitudes aún no están abiertas.')
      const secret = process.env.SUPABASE_SERVICE_KEY
      if (!secret)
        throw new CommunityError(503, 'Las solicitudes aún no están abiertas.')
      const ip =
        request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        'unknown'
      const key = createHmac('sha256', secret).update(ip).digest('hex')
      return response(await communityExecute(null, action, payload, key))
    }
    const user = await communityIdentity()
    if (!user)
      throw new CommunityError(
        401,
        'Accede con tu cuenta y confirma tu correo.',
      )
    return response(await communityExecute(user.id, action, payload))
  } catch (error) {
    return failure(error)
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action') ?? 'read'
    if (
      !['read', 'topic', 'admin', 'regulation', 'regulations'].includes(action)
    )
      throw new CommunityError(400, 'Consulta no válida.')
    const user = await communityIdentity()
    const id = url.searchParams.get('id') ?? ''
    if (
      ['topic', 'regulation'].includes(action) &&
      !/^[0-9a-f-]{36}$/i.test(id)
    )
      throw new CommunityError(400, 'Identificador no válido.')
    const payload = ['topic', 'regulation'].includes(action)
      ? {
          id,
          page: Math.floor(
            Math.min(
              1000,
              Math.max(0, Number(url.searchParams.get('page')) || 0),
            ),
          ),
        }
      : {
          q: (url.searchParams.get('q') ?? '').slice(0, 100),
          category: url.searchParams.get('category') ?? '',
          region: url.searchParams.get('region') ?? '',
          alert_id: url.searchParams.get('alert_id') ?? '',
          ambito: url.searchParams.get('ambito') ?? '',
          following: url.searchParams.get('following') ?? '',
          status: url.searchParams.get('status') ?? '',
          page: Math.floor(
            Math.min(
              1000,
              Math.max(0, Number(url.searchParams.get('page')) || 0),
            ),
          ),
        }
    return response(await communityExecute(user?.id ?? null, action, payload))
  } catch (error) {
    return failure(error)
  }
}
