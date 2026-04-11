import { describe, it, expect } from 'vitest'
import { buildAlertText } from '@/lib/sources/formatter'
import type { Alerta } from '@/lib/supabase'

const mockAlerta: Partial<Alerta> = {
  titulo: 'Real Decreto sobre actualización de rentas',
  fuente: 'BOE',
  urgencia: 'alta',
  subtema: 'arrendamiento',
  territorios: ['España'],
  score_relevancia: 8,
  resumen: 'El gobierno actualiza los límites de subida de renta.',
  impacto: 'Afecta a todos los contratos firmados antes de 2024.',
  accion_recomendada: 'Revisar contratos de arrendamiento firmados antes del 1/1/2024.',
  fecha_entrada_vigor: '2026-05-01',
  tipo_norma: 'Real Decreto',
}

describe('buildAlertText', () => {
  it('genera texto Free sin accion_recomendada', () => {
    const { free } = buildAlertText(mockAlerta as Alerta)
    expect(free).toContain('Real Decreto sobre actualización de rentas')
    expect(free).toContain('BOE')
    expect(free).not.toContain('Revisar contratos')
    expect(free).toContain('[Solo plan Pro]')
  })

  it('genera texto Pro con accion_recomendada', () => {
    const { pro } = buildAlertText(mockAlerta as Alerta)
    expect(pro).toContain('Revisar contratos de arrendamiento')
  })

  it('incluye el score en ambos textos', () => {
    const { free, pro } = buildAlertText(mockAlerta as Alerta)
    expect(free).toContain('8/10')
    expect(pro).toContain('8/10')
  })

  it('incluye emoji de urgencia alta (🔴)', () => {
    const { free } = buildAlertText(mockAlerta as Alerta)
    expect(free).toContain('🔴')
  })

  it('usa emoji amarillo para urgencia media', () => {
    const alertaMedia = { ...mockAlerta, urgencia: 'media' } as Alerta
    const { free } = buildAlertText(alertaMedia)
    expect(free).toContain('🟡')
  })

  it('usa emoji verde para urgencia baja', () => {
    const alertaBaja = { ...mockAlerta, urgencia: 'baja' } as Alerta
    const { free } = buildAlertText(alertaBaja)
    expect(free).toContain('🟢')
  })
})
