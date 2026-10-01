import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBORM, parseBORMSumario } from '@/lib/sources/borm'

// Campos reales del servicio oficial (30-sep-2026); suplemento del 30-jun.
const ordinary = { anunciosBoletin: [{ id: 845410, numero: 4728, fechaPublicacion: '30-09-2026', sumario: 'Acuerdo adoptado por la Junta de Gobierno Local del Excmo. Ayuntamiento de Cartagena, en fecha 6 de agosto de 2026, mediante el cual se modifica la aprobación inicial del Estudio de Detalle en finca urbana situado en calle Canciller de Ayala, 8, Barrio de la Concepción, presentado por Sociedad Municipal Casco Antiguo de Cartagena, S.A.', apartado: 'IV. Administración Local', anunciante: 'Cartagena' }] }
const supplement = { anunciosBoletin: [{ id: 843844, numero: 3162, fechaPublicacion: '30-06-2026', sumario: 'Resolución de 30 junio de 2026 de la Secretaria General de la Consejería de Educación y Formación Profesional por la que se dispone la publicación en el Boletín Oficial de la Región de Murcia de la Orden por la que se modifica la Escuela Municipal de Educación Infantil “Mucab” de Blanca (Murcia).', apartado: 'I. Comunidad Autónoma', anunciante: 'Consejería de Educación y Formación Profesional' }] }
afterEach(() => vi.unstubAllGlobals())

describe('BORM por fecha con suplementos', () => {
  it('conserva la URL para deduplicar y obtiene el identificador del TXT oficial', () => {
    expect(parseBORMSumario(ordinary, '2026-09-30')[0]).toMatchObject({
      url: 'https://www.borm.es/#/home/anuncio/30-09-2026/4728',
      texto_url: 'https://www.borm.es/services/anuncio/845410/txt',
      fecha_publicacion: '2026-09-30', fuente: 'BORM',
    })
  })
  it('no acepta fechas distintas ni estructuras vacías inventadas', () => {
    expect(() => parseBORMSumario(ordinary, '2026-09-29')).toThrow('otra fecha')
    expect(() => parseBORMSumario({}, '2026-09-30')).toThrow('no reconocido')
  })
  it('lee un suplemento real incluso si el boletín ordinario da 404', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(Response.json([{ id: 3486, numero: 7, fechaPublicacion: '30-06-2026' }]))
      .mockResolvedValueOnce(Response.json(supplement))
    vi.stubGlobal('fetch', fetchMock)
    const items = await fetchBORM('2026-06-30')
    expect(items).toHaveLength(1)
    expect(items[0].texto_url).toBe('https://www.borm.es/services/anuncio/843844/txt')
    expect(fetchMock.mock.calls[2][0]).toBe('https://www.borm.es/services/suplemento/30-06-2026/7/sumario')
  })
  it('si no se pueden revisar los suplementos no declara cobertura completa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(ordinary)).mockResolvedValueOnce(new Response('', { status: 503 })))
    await expect(fetchBORM('2026-09-30')).rejects.toThrow('503')
  })
  it('un 404 ordinario y suplementos vacíos es un resultado vacío explícito', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(Response.json([])))
    expect(await fetchBORM('2026-09-27')).toEqual([])
  })
})
