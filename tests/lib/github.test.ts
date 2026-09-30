import { describe, it, expect, vi } from 'vitest'
import { lanzarPipeline, URL_EJECUCIONES } from '@/lib/github'

const respuesta = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

describe('lanzarPipeline', () => {
  it('pide a GitHub lanzar pipeline.yml sobre main con el token', async () => {
    const f = vi.fn().mockResolvedValue(respuesta(204))
    const r = await lanzarPipeline('tok', f)
    expect(r).toEqual({ ok: true, url: URL_EJECUCIONES })
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/Orwell27/regtrack/actions/workflows/pipeline.yml/dispatches')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body)).toEqual({ ref: 'main' })
  })

  it('avisa si falta el token sin llamar a GitHub', async () => {
    const f = vi.fn()
    const r = await lanzarPipeline(undefined, f)
    expect(r).toEqual({ ok: false, error: 'Falta la variable GITHUB_WORKFLOW_TOKEN en Vercel.' })
    expect(f).not.toHaveBeenCalled()
  })

  it('explica los errores de token y de permisos', async () => {
    expect(await lanzarPipeline('tok', vi.fn().mockResolvedValue(respuesta(401, { message: 'Bad credentials' }))))
      .toEqual({ ok: false, error: 'El token de GitHub no es válido o ha caducado.' })
    const r403 = await lanzarPipeline('tok', vi.fn().mockResolvedValue(respuesta(403, { message: 'Resource not accessible' })))
    expect(r403.ok).toBe(false)
    if (!r403.ok) expect(r403.error).toContain('Actions: Read and write')
  })

  it('muestra el mensaje de GitHub en otros errores', async () => {
    const r = await lanzarPipeline('tok', vi.fn().mockResolvedValue(respuesta(422, { message: 'Workflow is disabled' })))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('422: Workflow is disabled')
  })

  it('maneja fallos de red', async () => {
    const r = await lanzarPipeline('tok', vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('ECONNRESET')
  })
})
