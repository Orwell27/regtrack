import { describe, it, expect } from 'vitest'
import { parseReferencesBOE } from '@/lib/sources/boe'

const xmlConReferencias = `<?xml version="1.0" encoding="UTF-8"?>
<documento>
  <metadatos><identificador>BOE-A-2024-99999</identificador></metadatos>
  <referencias>
    <anteriores>
      <anterior referencia="BOE-A-2013-11682" orden="MODIFICA">Modifica el artículo 18 del Real Decreto 235/2013</anterior>
    </anteriores>
  </referencias>
  <texto><p>Contenido de la norma</p></texto>
</documento>`

const xmlConMultiplesRefs = `<?xml version="1.0" encoding="UTF-8"?>
<documento>
  <referencias>
    <anteriores>
      <anterior referencia="BOE-A-2010-5555" orden="DEROGA">Deroga la Ley 4/2010</anterior>
      <anterior referencia="BOE-A-2015-8888" orden="MODIFICA">Modifica el artículo 3 de la Ley 5/2015</anterior>
    </anteriores>
  </referencias>
  <texto><p>Contenido</p></texto>
</documento>`

const xmlSinReferencias = `<?xml version="1.0" encoding="UTF-8"?>
<documento>
  <metadatos><identificador>BOE-A-2024-00001</identificador></metadatos>
  <texto><p>Contenido sin referencias</p></texto>
</documento>`

describe('parseReferencesBOE', () => {
  it('extrae una referencia de tipo modifica', () => {
    const refs = parseReferencesBOE(xmlConReferencias)
    expect(refs).toHaveLength(1)
    expect(refs[0].boe_id).toBe('BOE-A-2013-11682')
    expect(refs[0].tipo).toBe('modifica')
    expect(refs[0].descripcion).toContain('Real Decreto 235/2013')
  })

  it('extrae múltiples referencias', () => {
    const refs = parseReferencesBOE(xmlConMultiplesRefs)
    expect(refs).toHaveLength(2)
    expect(refs[0].tipo).toBe('deroga')
    expect(refs[1].tipo).toBe('modifica')
  })

  it('devuelve array vacío si no hay nodo referencias', () => {
    const refs = parseReferencesBOE(xmlSinReferencias)
    expect(refs).toEqual([])
  })

  it('devuelve array vacío con XML vacío o inválido', () => {
    expect(parseReferencesBOE('')).toEqual([])
    expect(parseReferencesBOE('not xml')).toEqual([])
  })
})
