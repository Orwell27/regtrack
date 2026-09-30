import { validarEntrada } from '../entrada'

const valido = {
  nombre: 'Piso centro',
  direccion: 'Calle Mayor 1, Cartagena',
  tipo: 'piso',
  modalidad: 'vut_completa',
  registro_turistico: 'si',
  fecha_alta_turistica: '2022-05-01',
  propiedad_horizontal: 'si',
  estatutos: 'no_prohiben',
  acuerdo_comunidad: 'desconocido',
  acceso_independiente: 'no',
  reside_en_vivienda: 'no',
  zona_urbanistica: 'desconocida',
  casco_historico: 'si',
  estancias_largas: 'no',
  limpieza_externa: 'si',
  seguro_rc: 'si',
  facturacion_anual: '24.000',
  gastos_comunidad_anual: '',
  notas: '  ',
}

describe('validarEntrada', () => {
  it('acepta un formulario completo y normaliza importes y textos vacíos', () => {
    const r = validarEntrada({ ...valido, facturacion_anual: '24000,50' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.datos.facturacion_anual).toBe(24000.5)
    expect(r.datos.gastos_comunidad_anual).toBeNull()
    expect(r.datos.notas).toBeNull()
    expect(r.datos.fecha_alta_turistica).toBe('2022-05-01')
  })

  it('entiende importes con formato español', () => {
    const imp = (x: string) => {
      const r = validarEntrada({ ...valido, facturacion_anual: x })
      return r.ok ? r.datos.facturacion_anual : 'error'
    }
    expect(imp('24.000')).toBe(24000)
    expect(imp('24.000,50')).toBe(24000.5)
    expect(imp('1.250.000 €')).toBe(1250000)
    expect(imp('1500.5')).toBe(1500.5)
  })

  it('exige nombre y dirección', () => {
    expect(validarEntrada({ ...valido, nombre: ' ' })).toEqual({ ok: false, error: 'Ponle un nombre al inmueble' })
    expect(validarEntrada({ ...valido, direccion: '' })).toEqual({ ok: false, error: 'Indica la dirección' })
  })

  it('rechaza opciones fuera de la lista', () => {
    const r = validarEntrada({ ...valido, modalidad: 'hotel' })
    expect(r.ok).toBe(false)
  })

  it('rechaza fechas e importes mal formados', () => {
    expect(validarEntrada({ ...valido, fecha_alta_turistica: '01/05/2022' }).ok).toBe(false)
    expect(validarEntrada({ ...valido, facturacion_anual: '-5' }).ok).toBe(false)
    expect(validarEntrada({ ...valido, facturacion_anual: 'mucho' }).ok).toBe(false)
  })

  it('rechaza cuerpos que no son objetos', () => {
    expect(validarEntrada(null).ok).toBe(false)
    expect(validarEntrada('texto').ok).toBe(false)
  })
})
