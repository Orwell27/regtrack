import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AlertDetailView } from '@/components/subscriber/AlertDetailView'
import { AlertListView } from '@/components/subscriber/AlertListView'
import type { Alerta } from '@/lib/supabase'

const alerta = {
  id: 'example', titulo: 'Documento de prueba', resumen: 'Resumen público',
  fuente: 'BOE', subtema: 'arrendamiento', urgencia: 'alta', territorios: ['España'],
  impacto: 'IMPACTO_PRIVADO', accion_recomendada: 'ACCION_PRIVADA', afectados: ['propietarios'],
  deroga_modifica: 'DEROGACION_PRIVADA', plazo_adaptacion: 0,
  url: 'https://example.com/norma', fecha_publicacion: '2026-09-30',
} as Alerta

describe('subscriber presentation', () => {
  it('keeps Pro content out of the Free HTML and offers one upgrade', () => {
    const html = renderToStaticMarkup(<AlertDetailView alerta={alerta} plan="free" relaciones={[]} />)
    expect(html).toContain('Resumen público')
    expect(html).not.toContain('IMPACTO_PRIVADO')
    expect(html).not.toContain('ACCION_PRIVADA')
    expect(html).not.toContain('DEROGACION_PRIVADA')
    expect(html.match(/Conocer Pro/g)).toHaveLength(1)
  })
  it('renders zero days as immediate, not as missing', () => {
    const html = renderToStaticMarkup(<AlertDetailView alerta={alerta} plan="pro" relaciones={[]} />)
    expect(html).toContain('Aplicación inmediata')
    expect(html).toContain('IMPACTO_PRIVADO')
    expect(html).toContain('ACCION_PRIVADA')
  })
  it('separates empty results from a failed query', () => {
    const props = { alertas: [], count: 0, params: { q: 'sin resultado' }, plan: 'free' as const, subcats: [], interestCount: 0, relevantIds: [], subsByAlerta: {} }
    expect(renderToStaticMarkup(<AlertListView {...props} />)).toContain('No hay coincidencias')
    const failed = renderToStaticMarkup(<AlertListView {...props} error />)
    expect(failed).toContain('No hemos podido cargar')
    expect(failed).not.toContain('No hay coincidencias')
  })
  it('preserves the listing filters in the detail link', () => {
    const html = renderToStaticMarkup(<AlertListView alertas={[alerta]} count={1} params={{ fuente:'BOE,BORM' }} plan="pro" subcats={[]} interestCount={0} relevantIds={[]} subsByAlerta={{}} />)
    expect(html).toContain('volver=%2Falertas%3Ffuente%3DBOE%252CBORM')
  })
})
