import { describe, it, expect } from 'vitest'
import { buildAlertaContext, type AlertaContexto } from '@/lib/asistente'

const BASE: AlertaContexto = {
  titulo: 'Real Decreto 123/2026',
  resumen: 'Regula los requisitos de habitabilidad.',
  impacto: 'Afecta a promotores con proyectos en curso.',
  accion_recomendada: 'Revisar los proyectos pendientes de licencia.',
  afectados: ['promotores', 'constructores'],
  territorios: ['Madrid', 'Cataluña'],
  plazo_adaptacion: 90,
  deroga_modifica: 'Modifica el RD 45/2010.',
  subtema: 'obra_nueva',
  tipo_norma: 'Real Decreto',
  fecha_entrada_vigor: '2026-07-01',
}

describe('buildAlertaContext', () => {
  it('incluye título, resumen, impacto y acción recomendada', () => {
    const result = buildAlertaContext(BASE)
    expect(result).toContain('Real Decreto 123/2026')
    expect(result).toContain('Regula los requisitos de habitabilidad.')
    expect(result).toContain('Afecta a promotores con proyectos en curso.')
    expect(result).toContain('Revisar los proyectos pendientes de licencia.')
  })

  it('incluye afectados y territorios', () => {
    const result = buildAlertaContext(BASE)
    expect(result).toContain('promotores')
    expect(result).toContain('Madrid')
  })

  it('incluye plazo_adaptacion en días', () => {
    const result = buildAlertaContext(BASE)
    expect(result).toContain('90 días')
  })

  it('incluye fecha_entrada_vigor', () => {
    const result = buildAlertaContext(BASE)
    expect(result).toContain('2026-07-01')
  })

  it('incluye deroga_modifica', () => {
    const result = buildAlertaContext(BASE)
    expect(result).toContain('Modifica el RD 45/2010.')
  })

  it('omite plazo_adaptacion si es null', () => {
    const result = buildAlertaContext({ ...BASE, plazo_adaptacion: null })
    expect(result).not.toContain('Plazo de adaptación')
  })

  it('omite deroga_modifica si es null', () => {
    const result = buildAlertaContext({ ...BASE, deroga_modifica: null })
    expect(result).not.toContain('Deroga/Modifica')
  })

  it('omite fecha_entrada_vigor si es null', () => {
    const result = buildAlertaContext({ ...BASE, fecha_entrada_vigor: null })
    expect(result).not.toContain('Entra en vigor')
  })

  it('omite territorios si el array está vacío', () => {
    const result = buildAlertaContext({ ...BASE, territorios: [] })
    expect(result).not.toContain('Territorios:')
  })
})
