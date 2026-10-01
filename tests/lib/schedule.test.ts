import { describe, expect, it } from 'vitest'
import { assessSchedule } from '@/lib/pipeline/schedule'

const run = { id: 1, created_at: '2026-07-06T12:06:49Z', status: 'completed', conclusion: 'success' }
describe('vigilancia del programador', () => {
  it('el arranque del propio cron no oculta un hueco ni el fallo anterior', () => {
    const current = { id: 2, created_at: '2026-09-30T08:17:00Z', status: 'in_progress', conclusion: null }
    const result = assessSchedule('active', [current, { ...run, conclusion: 'failure' }], new Date('2026-09-30T08:18:00Z'), current.id)
    expect(result.ok).toBe(false)
    expect(result.lastScheduledAt).toBe(run.created_at)
    expect(result.problems).toContain('Más de 36 horas sin ejecución programada')
    expect(result.problems).toContain('Última ejecución programada: failure')
  })
  it('no confunde workflow activo con ejecución reciente: hueco real julio-septiembre', () => {
    const result = assessSchedule('active', [run], new Date('2026-09-30T09:00:00Z'))
    expect(result.ok).toBe(false)
    expect(result.problems).toContain('Más de 36 horas sin ejecución programada')
  })
  it('acepta una ejecución programada reciente correcta', () => {
    expect(assessSchedule('active', [run], new Date('2026-07-07T09:00:00Z')).ok).toBe(true)
  })
  it('detecta desactivación, ausencia y fallos recientes', () => {
    expect(assessSchedule('disabled_inactivity', []).ok).toBe(false)
    expect(assessSchedule('active', [{ ...run, conclusion: 'failure' }], new Date(run.created_at)).ok).toBe(false)
  })
})
