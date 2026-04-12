import { describe, it, expect } from 'vitest'
import { matchAlertas } from '@/lib/matching'
import type { Alerta, Usuario } from '@/lib/supabase'

const alerta: Partial<Alerta> = {
  id: 'alerta-1',
  subtema: 'arrendamiento',
  territorios: ['España'],
  ambito: 'estatal',
  score_relevancia: 8,
  urgencia: 'alta',
  texto_alerta: 'Texto free',
  texto_alerta_pro: 'Texto pro',
}

const usuarioFree: Partial<Usuario> = {
  id: 'user-1',
  plan: 'free',
  activo: true,
  subtemas: ['arrendamiento'],
  territorios: ['Madrid'],
  urgencia_minima: 'baja',
  score_minimo: 7,
  telegram_id: '123456',
}

const usuarioPro: Partial<Usuario> = {
  id: 'user-2',
  plan: 'pro',
  activo: true,
  subtemas: ['arrendamiento'],
  territorios: ['Barcelona'],
  urgencia_minima: 'baja',
  score_minimo: 5,
  telegram_id: '789012',
}

describe('matchAlertas', () => {
  it('hace match cuando alerta es estatal y usuario tiene cualquier territorio', () => {
    const matches = matchAlertas(
      [alerta as Alerta],
      [usuarioFree as Usuario],
      {}
    )
    expect(matches).toHaveLength(1)
    expect(matches[0].usuario_id).toBe('user-1')
  })

  it('devuelve texto_alerta_pro para usuarios Pro', () => {
    const matches = matchAlertas(
      [alerta as Alerta],
      [usuarioPro as Usuario],
      {}
    )
    expect(matches[0].texto).toBe('Texto pro')
  })

  it('devuelve texto_alerta para usuarios Free', () => {
    const matches = matchAlertas(
      [alerta as Alerta],
      [usuarioFree as Usuario],
      {}
    )
    expect(matches[0].texto).toBe('Texto free')
  })

  it('no hace match si score < score_minimo del usuario', () => {
    const alertaBajaScore = { ...alerta, score_relevancia: 4 } as Alerta
    const matches = matchAlertas(
      [alertaBajaScore],
      [usuarioFree as Usuario],
      {}
    )
    expect(matches).toHaveLength(0)
  })

  it('respeta límite de 3 alertas/día para Free', () => {
    const entregasHoy: Record<string, number> = { 'user-1': 3 }
    const matches = matchAlertas(
      [alerta as Alerta],
      [usuarioFree as Usuario],
      entregasHoy
    )
    expect(matches).toHaveLength(0)
  })

  it('no aplica límite diario para Pro', () => {
    const entregasHoy: Record<string, number> = { 'user-2': 10 }
    const matches = matchAlertas(
      [alerta as Alerta],
      [usuarioPro as Usuario],
      entregasHoy
    )
    expect(matches).toHaveLength(1)
  })

  it('no hace match si subtema no coincide', () => {
    const alertaOtroSubtema = { ...alerta, subtema: 'fiscalidad' } as Alerta
    const matches = matchAlertas(
      [alertaOtroSubtema],
      [usuarioFree as Usuario],
      {}
    )
    expect(matches).toHaveLength(0)
  })
})
