import { describe, it, expect } from 'vitest'
import { parseBOCMRSS } from '@/lib/sources/bocm'
import { readFileSync } from 'fs'
import { join } from 'path'

const fixture = readFileSync(join(process.cwd(), 'tests/fixtures/bocm-rss.xml'), 'utf-8')

describe('parseBOCMRSS', () => {
  it('parsea un feed RSS con un solo item', () => {
    const items = parseBOCMRSS(fixture)
    expect(items).toHaveLength(1)
    expect(items[0].fuente).toBe('BOCM')
    expect(items[0].titulo).toContain('licencias urbanísticas')
  })

  it('devuelve array vacío para XML vacío', () => {
    const items = parseBOCMRSS('<rss><channel></channel></rss>')
    expect(items).toEqual([])
  })
})
