import { describe, expect, it } from 'vitest'
import { dateRange, madridDate, scanDates } from '@/lib/pipeline/dates'

describe('continuidad por fechas', () => {
  it('usa el día de Madrid incluso cerca de medianoche UTC', () => {
    expect(madridDate(new Date('2026-09-30T22:30:00Z'))).toBe('2026-10-01')
  })
  it('la ventana del lunes incluye el sábado', () => {
    expect(scanDates([], new Date('2026-09-28T08:00:00Z'))).toEqual(['2026-09-26', '2026-09-27', '2026-09-28'])
  })
  it('permite recuperar un intervalo concreto sin excluir sábados', () => {
    expect(scanDates(['--from', '2026-09-25', '--to', '2026-09-27'])).toHaveLength(3)
  })
  it('rechaza fechas imposibles, parciales, invertidas o intervalos sin límite', () => {
    expect(() => dateRange('2026-02-30', '2026-03-01')).toThrow()
    expect(() => dateRange('2026-09-30', '2026-09-29')).toThrow()
    expect(() => dateRange('2026-01-01', '2026-09-30')).toThrow()
    expect(() => scanDates(['--from', '2026-09-25'])).toThrow()
  })
})
