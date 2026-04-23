import { describe, it, expect } from 'vitest'
import { getHeatColor } from '../heatmap'

describe('getHeatColor', () => {
  it('returns base color when count is 0', () => {
    expect(getHeatColor(0, 10)).toBe('#f1f5f9')
  })

  it('returns darkest color when count equals max', () => {
    expect(getHeatColor(10, 10)).toBe('#9a3412')
  })

  it('returns mid-high color at ratio 0.5', () => {
    expect(getHeatColor(5, 10)).toBe('#ea580c')
  })

  it('returns darkest color when max is 1 and count is 1', () => {
    expect(getHeatColor(1, 1)).toBe('#9a3412')
  })

  it('returns lightest non-zero color at ratio 0.2 (count 2, max 10)', () => {
    expect(getHeatColor(2, 10)).toBe('#fed7aa')
  })
})
