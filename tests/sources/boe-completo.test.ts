import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchBOEText, parseBOESumario } from '@/lib/sources/boe'
import { SourceAccessBlockedError } from '@/lib/sources/http'
import sumario from '../fixtures/boe-sumario-20200314.json'

afterEach(() => vi.unstubAllGlobals())

describe('sumarios BOE con varias ediciones', () => {
  it('lee el extraordinario del estado de alarma y las secciones I/III del ordinario del mismo día', () => {
    const items = parseBOESumario(sumario)
    expect(items).toHaveLength(46)
    expect(items.find(item => item.id === 'BOE-A-2020-3692')).toMatchObject({
      epigrafe: 'Estado de alarma',
      departamento: 'MINISTERIO DE LA PRESIDENCIA, RELACIONES CON LAS CORTES Y MEMORIA DEMOCRÁTICA',
      _xmlUrl: 'https://www.boe.es/diario_boe/xml.php?id=BOE-A-2020-3692',
    })
    expect(items.some(item => item.id === 'BOE-A-2020-3636')).toBe(true)
    expect(items.some(item => item.id === 'BOE-A-2020-3691')).toBe(true)
    expect(items.some(item => item.id === 'BOE-A-2020-3640')).toBe(false)
  })

  it('acepta un único diario y rechaza un cambio de estructura en una sección relevante', () => {
    expect(parseBOESumario({ data: { sumario: { diario: sumario.data.sumario.diario[0] } } })).toHaveLength(1)
    expect(() => parseBOESumario({ data: { sumario: { diario: [{ seccion: { codigo: '1', contenido_nuevo: [] } }] } } })).toThrow(/Formato/)
    expect(() => parseBOESumario({ data: { sumario: { nueva_estructura: [] } } })).toThrow(/Formato/)
  })
})

describe('texto BOE íntegro desde el nodo oficial', () => {
  it('conserva el artículo inicial aunque Jefatura aparezca después y retiene las referencias', async () => {
    const xml = `<documento>
      <metadatos><titulo>METADATO FUERA DEL TEXTO</titulo></metadatos>
      <referencias><anteriores><anterior referencia="BOE-A-2020-1" orden="MODIFICA">Norma anterior</anterior></anteriores></referencias>
      <texto><p>Artículo 1. La persona titular deberá registrar el alojamiento antes del inicio de la actividad.</p>
      <p>Artículo 2. La Jefatura competente inspeccionará los establecimientos y notificará las medidas previstas en esta disposición.</p></texto>
    </documento>`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(xml)))
    const result = await fetchBOEText('BOE-A-TEST')
    expect(result.texto).toContain('Artículo 1. La persona titular')
    expect(result.texto).toContain('Artículo 2. La Jefatura competente')
    expect(result.texto).not.toContain('METADATO FUERA DEL TEXTO')
    expect(result.referencias_boe).toEqual([{ boe_id: 'BOE-A-2020-1', tipo: 'modifica', descripcion: 'Norma anterior' }])
  })

  it('no acepta metadatos largos como texto cuando falta el nodo oficial', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`<documento><metadatos><titulo>${'Título de metadatos. '.repeat(10)}</titulo></metadatos></documento>`)))
    await expect(fetchBOEText('BOE-A-TEST')).rejects.toThrow('No se pudo leer el texto BOE')
  })

  it('mantiene el orden de párrafos, tablas y texto con entidades XML', async () => {
    const xml = '<documento><texto><p>Artículo 1. Obligaciones de los titulares de establecimientos turísticos.</p><table><tr><td>Primer valor</td><td>A &amp; B</td></tr></table><p>Disposición final. Esta norma entrará en vigor al día siguiente de su publicación.</p></texto></documento>'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(xml)))
    const { texto } = await fetchBOEText('BOE-A-TEST')
    expect(texto).toContain('Primer valor A & B')
    expect(texto.indexOf('Artículo 1')).toBeLessThan(texto.indexOf('Primer valor'))
    expect(texto.indexOf('Primer valor')).toBeLessThan(texto.indexOf('Disposición final'))
  })

  it('propaga el bloqueo para que el pipeline no repita peticiones a la fuente', async () => {
    const error = new SourceAccessBlockedError('Acceso bloqueado')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
    await expect(fetchBOEText('BOE-A-TEST')).rejects.toBe(error)
  })

  it.each([
    '<documento><texto></texto></documento>',
    `<documento><texto><p>${'Texto. '.repeat(20)}</texto></documento>`,
    `<documento><texto><p>${'a'.repeat(120_001)}</p></texto></documento>`,
  ])('rechaza texto vacío, XML cortado y documentos que requieren partición', async xml => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(xml)))
    await expect(fetchBOEText('BOE-A-TEST')).rejects.toThrow('No se pudo leer el texto BOE')
  })
})
