import { clasificar, impactoIva } from '../clasificar'
import { municipioEnPunto, MUNICIPIO, MUNICIPIOS_MURCIA, LIMITES_MURCIA } from '../municipios'
import type { Inmueble } from '../tipos'

type Datos = Parameters<typeof clasificar>[0]

function base(over: Partial<Datos> = {}): Datos {
  return {
    nombre: 'Piso de prueba',
    direccion: 'Calle Mayor 1, Cartagena',
    municipio_ine: MUNICIPIO.cartagena,
    lat: 37.6, lon: -0.98,
    tipo: 'piso',
    modalidad: 'vut_completa',
    registro_turistico: 'si',
    fecha_alta_turistica: '2022-05-01',
    propiedad_horizontal: 'si',
    estatutos: 'no_prohiben',
    acuerdo_comunidad: 'desconocido',
    acceso_independiente: 'no',
    reside_en_vivienda: 'no',
    zona_urbanistica: 'otra',
    casco_historico: 'no',
    estancias_largas: 'no',
    limpieza_externa: 'si',
    seguro_rc: 'si',
    facturacion_anual: null,
    gastos_comunidad_anual: null,
    notas: null,
    ...over,
  } satisfies Omit<Inmueble, 'id' | 'usuario_id' | 'created_at' | 'updated_at'>
}

const ids = (d: Datos) => clasificar(d).exposiciones.map(e => e.id)

describe('impactoIva', () => {
  it('aproxima el ejemplo del boletín con limpieza externa (−157 € allí, con gastos exactos)', () => {
    expect(impactoIva(24000, true)).toBe(-166)
  })
  it('pesa más sin limpieza externa', () => {
    expect(impactoIva(24000, false)).toBeLessThan(impactoIva(24000, true))
  })
})

describe('clasificar', () => {
  it('piso registrado antes de 2025, sin problemas conocidos: sólida', () => {
    const c = clasificar(base())
    expect(c.clase).toBe('solida')
    expect(c.tipologia).toBe('Piso en edificio de viviendas')
    expect(ids(base())).toContain('iva')
  })

  it('sin registro turístico: frágil', () => {
    const c = clasificar(base({ registro_turistico: 'no' }))
    expect(c.clase).toBe('fragil')
    expect(c.exposiciones[0].id).toBe('registro')
  })

  it('estatutos que prohíben: frágil', () => {
    expect(clasificar(base({ estatutos: 'prohiben' })).clase).toBe('fragil')
  })

  it('alta posterior a la reforma de la LPH sin acuerdo de comunidad: frágil', () => {
    const c = clasificar(base({ fecha_alta_turistica: '2025-04-15', acuerdo_comunidad: 'no' }))
    expect(c.clase).toBe('fragil')
    expect(c.exposiciones.find(e => e.id === 'comunidad')?.nivel).toBe('alta')
  })

  it('alta posterior con acuerdo de 3/5: no es alta', () => {
    const c = clasificar(base({ fecha_alta_turistica: '2025-04-15', acuerdo_comunidad: 'si' }))
    expect(c.exposiciones.find(e => e.id === 'comunidad')?.nivel).not.toBe('alta')
  })

  it('edificio sin comunidad: sin exposición de comunidad', () => {
    expect(ids(base({ tipo: 'edificio', propiedad_horizontal: 'no' }))).not.toContain('comunidad')
  })

  it('Cartagena, residencial colectivo y registrado: vigilancia por el PGOU', () => {
    const c = clasificar(base({ zona_urbanistica: 'residencial_colectivo', estatutos: 'desconocido' }))
    expect(c.exposiciones.find(e => e.id === 'pgou')?.nivel).toBe('media')
    expect(c.clase).toBe('vigilancia')
  })

  it('Cartagena, residencial colectivo sin registrar: PGOU alto', () => {
    const c = clasificar(base({ zona_urbanistica: 'residencial_colectivo', registro_turistico: 'no' }))
    expect(c.exposiciones.find(e => e.id === 'pgou')?.nivel).toBe('alta')
  })

  it('residencial genérico con acceso independiente: favorable', () => {
    const c = clasificar(base({ zona_urbanistica: 'residencial_generico', acceso_independiente: 'si' }))
    expect(c.exposiciones.find(e => e.id === 'pgou')?.nivel).toBe('favorable')
  })

  it('las reglas de Cartagena no se aplican en otro municipio', () => {
    const d = base({ municipio_ine: MUNICIPIO.mazarron, zona_urbanistica: 'residencial_colectivo', casco_historico: 'si' })
    expect(ids(d)).not.toContain('pgou')
    expect(ids(d)).not.toContain('peopch')
    expect(ids(d)).toContain('convivencia')
  })

  it('por habitaciones sin residir: frágil', () => {
    expect(clasificar(base({ modalidad: 'vut_habitaciones', reside_en_vivienda: 'no' })).clase).toBe('fragil')
  })

  it('calcula el recargo posible de gastos de comunidad', () => {
    const c = clasificar(base({ gastos_comunidad_anual: 1500 }))
    expect(c.exposiciones.find(e => e.id === 'comunidad')?.impacto_euros).toBe(-300)
  })

  it('pide los datos que faltan', () => {
    const c = clasificar(base({ fecha_alta_turistica: null, zona_urbanistica: 'desconocida', casco_historico: 'desconocido' }))
    expect(c.pendientes).toEqual(expect.arrayContaining([
      'Fecha de alta en el registro turístico',
      'Zona del PGOU de Cartagena',
      'Si está en el casco histórico',
    ]))
  })

  it('sin uso turístico: sin exposiciones', () => {
    const c = clasificar(base({ modalidad: 'sin_uso_turistico' }))
    expect(c.exposiciones).toEqual([])
    expect(c.clase).toBe('solida')
  })

  it('ordena de más a menos grave', () => {
    const c = clasificar(base({ registro_turistico: 'no', zona_urbanistica: 'residencial_generico', acceso_independiente: 'si' }))
    const niveles = c.exposiciones.map(e => e.nivel)
    expect(niveles[0]).toBe('alta')
    expect(niveles[niveles.length - 1]).toBe('favorable')
  })
})

describe('municipios', () => {
  it('tiene los 45 municipios de la Región con sus datos del INE', () => {
    expect(LIMITES_MURCIA.features).toHaveLength(45)
    expect(Object.keys(MUNICIPIOS_MURCIA)).toHaveLength(45)
    expect(MUNICIPIOS_MURCIA[MUNICIPIO.cartagena]).toMatchObject({ nombre: 'Cartagena', vut: 1307 })
  })

  it('sitúa puntos conocidos en su municipio', () => {
    expect(municipioEnPunto(37.6004, -0.9867)).toBe(MUNICIPIO.cartagena)   // Calle Comedias, Cartagena
    expect(municipioEnPunto(37.9834, -1.1299)).toBe('30030')                // Murcia, plaza Belluga
    expect(municipioEnPunto(40.4168, -3.7038)).toBeNull()                    // Madrid
  })
})
