// tests/api/rutas-admin.test.ts
// Las rutas de administración responden 401 sin sesión y 403 a un suscriptor,
// sin leer ni escribir nada en la BD ni mandar mensajes.
//
// No se mockea getAuthUser: se mockea lo que hay debajo (la verificación del
// token de Supabase y la BD). Así el test recorre la cadena real
// ruta → requireAdmin → getAuthUser, y un cambio que vuelva a fiarse de la
// cookie sin verificarla (getSession) lo pone en rojo.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type Usuario = { id: string; rol: string; plan: string; nombre: string }
type Llamada = { tabla: string; metodos: string[] }

const estado = vi.hoisted(() => ({
  llamadas: [] as { tabla: string; metodos: string[] }[],
  usuario: null as { id: string; rol: string; plan: string; nombre: string } | null,
  responder: (() => ({ data: null, error: null })) as (tabla: string, metodos: string[]) => unknown,
}))

const auth = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getSession: vi.fn(),
}))

const efectos = vi.hoisted(() => ({
  notifyUsers: vi.fn(async () => {}),
  notifyGrupos: vi.fn(async () => {}),
  sendMessage: vi.fn(async () => {}),
  exec: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [] })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getClaims: auth.getClaims, getSession: auth.getSession } }),
}))

// BD falsa: cada from() apunta la cadena de métodos que se le llama y, al
// esperarla, responde. La búsqueda del usuario de la sesión devuelve estado.usuario.
vi.mock('@/lib/supabase', () => ({
  createNextServerClient: () => ({
    from(tabla: string) {
      const llamada = { tabla, metodos: [] as string[] }
      estado.llamadas.push(llamada)
      const builder: object = new Proxy({}, {
        get(_, prop) {
          if (prop === 'then') {
            const respuesta = tabla === 'usuarios' && llamada.metodos.includes('or')
              ? { data: estado.usuario, error: null }
              : estado.responder(tabla, llamada.metodos)
            return (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) =>
              Promise.resolve(respuesta).then(ok, ko)
          }
          return () => {
            llamada.metodos.push(String(prop))
            return builder
          }
        },
      })
      return builder
    },
  }),
}))

vi.mock('@/lib/telegram', () => ({ notifyUsers: efectos.notifyUsers, sendMessage: efectos.sendMessage }))
vi.mock('@/lib/sectorial/telegram-grupos', () => ({ notifyGrupos: efectos.notifyGrupos }))
vi.mock('child_process', () => ({ exec: efectos.exec }))

import * as config from '@/app/api/config/route'
import * as alerta from '@/app/api/alertas/[id]/route'
import * as enviar from '@/app/api/alertas/[id]/enviar/route'
import * as relaciones from '@/app/api/alertas/[id]/relaciones/route'
import * as usuario from '@/app/api/usuarios/[id]/route'
import * as grupos from '@/app/api/admin/grupos-telegram/route'
import * as subcategoria from '@/app/api/admin/subcategorias/[id]/route'
import * as pipeline from '@/app/api/pipeline/run/route'

const SUSCRIPTOR: Usuario = { id: 'u-1', rol: 'subscriber', plan: 'free', nombre: 'Suscriptor' }
const ADMIN: Usuario = { id: 'u-admin', rol: 'admin', plan: 'pro', nombre: 'Admin' }

function peticion(metodo: string, ruta: string, cuerpo?: unknown) {
  return new NextRequest(`http://localhost${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

const RUTAS: [string, () => Promise<Response>][] = [
  ['GET /api/config', () => config.GET()],
  ['PUT /api/config', () => config.PUT(peticion('PUT', '/api/config', { score_minimo: 0 }))],
  ['POST /api/alertas/[id]', () => alerta.POST(peticion('POST', '/api/alertas/a-1', { accion: 'aprobar' }), ctx('a-1'))],
  ['POST /api/alertas/[id]/enviar', () => enviar.POST(peticion('POST', '/api/alertas/a-1/enviar'), ctx('a-1'))],
  ['GET /api/alertas/[id]/relaciones', () => relaciones.GET(peticion('GET', '/api/alertas/a-1/relaciones'), ctx('a-1'))],
  // El suscriptor intenta darse el plan Pro a sí mismo
  ['POST /api/usuarios/[id]', () => usuario.POST(peticion('POST', '/api/usuarios/u-1', { plan: 'pro' }), ctx('u-1'))],
  ['GET /api/admin/grupos-telegram', () => grupos.GET()],
  ['POST /api/admin/grupos-telegram', () => grupos.POST(peticion('POST', '/api/admin/grupos-telegram', { nombre: 'g', chat_id: '-100', subcategoria_id: 1 }))],
  ['DELETE /api/admin/grupos-telegram', () => grupos.DELETE(peticion('DELETE', '/api/admin/grupos-telegram?id=1'))],
  ['PATCH /api/admin/subcategorias/[id]', () => subcategoria.PATCH(peticion('PATCH', '/api/admin/subcategorias/1', { activo: false }), ctx('1'))],
  ['POST /api/pipeline/run', () => pipeline.POST()],
]

function sinSesion() {
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  auth.getClaims.mockResolvedValue({ data: null, error: null })
  estado.usuario = null
}

function sesionDe(u: Usuario) {
  auth.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt', user: { id: 'auth-1', email: 'x@test.com' } } }, error: null })
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'auth-1', email: 'x@test.com' } }, error: null })
  estado.usuario = u
}

// Cookie escrita a mano con el email del admin: la sesión se lee de la cookie
// sin verificar, pero la firma del token no es válida.
function cookieFalsificada() {
  auth.getSession.mockResolvedValue({ data: { session: { access_token: 'inventado', user: { id: 'auth-admin', email: 'admin@test.com' } } }, error: null })
  auth.getClaims.mockResolvedValue({ data: null, error: new Error('Invalid JWT signature') })
  estado.usuario = ADMIN
}

function sinEfectos() {
  expect(efectos.notifyUsers).not.toHaveBeenCalled()
  expect(efectos.notifyGrupos).not.toHaveBeenCalled()
  expect(efectos.sendMessage).not.toHaveBeenCalled()
  expect(efectos.exec).not.toHaveBeenCalled()
}

const esBusquedaDeSesion = (l: Llamada) => l.tabla === 'usuarios' && l.metodos.join('.') === 'select.or.single'

beforeEach(() => {
  vi.clearAllMocks()
  estado.llamadas = []
  estado.usuario = null
  estado.responder = () => ({ data: null, error: null })
})

describe.each(RUTAS)('%s', (_nombre, llamar) => {
  it('sin sesión → 401, sin tocar la BD', async () => {
    sinSesion()
    const res = await llamar()
    expect(res.status).toBe(401)
    expect(estado.llamadas).toEqual([])
    sinEfectos()
  })

  it('con cookie falsificada con el email del admin → 401', async () => {
    cookieFalsificada()
    const res = await llamar()
    expect(res.status).toBe(401)
    expect(estado.llamadas).toEqual([])
    sinEfectos()
  })

  it('suscriptor → 403, solo se lee su propio usuario', async () => {
    sesionDe(SUSCRIPTOR)
    const res = await llamar()
    expect(res.status).toBe(403)
    expect(estado.llamadas.filter(l => !esBusquedaDeSesion(l))).toEqual([])
    sinEfectos()
  })
})

// Controles positivos: sin ellos, una ruta que devolviera 401 siempre pasaría
// los casos de arriba.
describe('con sesión de admin', () => {
  it('POST /api/usuarios/[id] cambia el plan', async () => {
    sesionDe(ADMIN)
    const res = await usuario.POST(peticion('POST', '/api/usuarios/u-1', { plan: 'pro' }), ctx('u-1'))
    expect(res.status).toBe(200)
    expect(estado.llamadas.filter(l => !esBusquedaDeSesion(l))).toEqual([
      { tabla: 'usuarios', metodos: ['update', 'eq'] },
    ])
  })

  it('POST /api/alertas/[id]/enviar envía por Telegram y marca la alerta como enviada', async () => {
    sesionDe(ADMIN)
    estado.responder = (tabla, metodos) => {
      if (tabla === 'alertas' && metodos.includes('single')) {
        return {
          data: {
            id: 'a-1', estado: 'aprobada', url: 'https://www.boe.es/x', texto_alerta: 'texto',
            texto_alerta_pro: 'texto pro', titulo: 'Título', resumen: null, score_relevancia: 8,
            territorios: [], fuente: 'BOE',
          },
          error: null,
        }
      }
      if (tabla === 'usuarios' && metodos.includes('not')) {
        return { data: [{ id: 'u-5', telegram_id: '123', plan: 'pro' }], error: null }
      }
      return { data: null, error: null }
    }

    const res = await enviar.POST(peticion('POST', '/api/alertas/a-1/enviar'), ctx('a-1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, enviados: 1 })
    expect(efectos.notifyUsers).toHaveBeenCalledOnce()
    expect(estado.llamadas.filter(l => !esBusquedaDeSesion(l)).map(l => `${l.tabla}:${l.metodos.join('.')}`)).toEqual([
      'alertas:select.eq.single',
      'usuarios:select.eq.not',
      'entregas:insert',
      'alertas:update.eq',
    ])
  })
})
