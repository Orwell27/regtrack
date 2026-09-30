import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import Page from '@/app/(subscriber)/alertas/page'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createNextServerClient: vi.fn() }))
let urls: URL[]
let failAlerts: boolean
beforeEach(() => {
  urls = []
  failAlerts = false
  vi.mocked(getAuthUser).mockResolvedValue({ authId:'auth-demo', email:'demo@example.com', rol:'subscriber', plan:'pro', usuarioId:'user-demo', nombre:'Demo' })
  const client = createClient('https://fixture.invalid', 'test-key', { global: { fetch: async input => {
    const url = new URL(String(input))
    urls.push(url)
    if (url.pathname.endsWith('/alertas') && failAlerts) return new Response(JSON.stringify({ message:'offline', code:'TEST' }), {status:400})
    let rows: unknown[] = []
    if (url.pathname.endsWith('/suscriptor_intereses')) rows = [{subcategoria_id:2}]
    if (url.pathname.endsWith('/subcategorias')) rows = [{id:1,slug:'alquiler',nombre:'Alquiler'}]
    if (url.pathname.endsWith('/alerta_sectores')) rows = [{alerta_id: url.searchParams.get('subcategoria_id') === 'eq.1' ? 'category-match' : 'interest-match'}]
    return new Response(JSON.stringify(rows), {status:200, headers:{'Content-Type':'application/json','Content-Range':'0-0/0'}})
  }}})
  vi.mocked(createNextServerClient).mockReturnValue(client)
})
describe('published alert queries', () => {
  it('only queries published alerts, combines boletines and searches literal words', async () => {
    await Page({searchParams:Promise.resolve({fuente:'BOE,BORM',q:'alquiler',page:'2'})})
    const query = urls.find(u=>u.pathname.endsWith('/alertas'))!.searchParams
    expect(query.get('estado')).toBe('eq.enviada')
    expect(query.get('fuente')).toContain('BOE,BORM')
    expect(query.get('or')).toBe('(titulo.ilike.%alquiler%,resumen.ilike.%alquiler%)')
    expect(query.get('offset')).toBe('20')
    expect(urls.find(u=>u.pathname.endsWith('/suscriptor_intereses'))!.searchParams.get('usuario_id')).toBe('eq.user-demo')
  })
  it('keeps category and personal interests as simultaneous constraints', async () => {
    await Page({searchParams:Promise.resolve({subcategoria:'alquiler',solo_intereses:'true'})})
    expect(urls.find(u=>u.pathname.endsWith('/alertas'))!.searchParams.getAll('id')).toEqual(['in.(category-match)','in.(interest-match)'])
  })
  it('returns the error state when the database fails', async () => {
    failAlerts = true
    const result = await Page({searchParams:Promise.resolve({})})
    expect(result.props.error).toBe(true)
  })
})

