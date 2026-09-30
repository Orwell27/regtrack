import { describe, it, expect, afterEach } from 'vitest'
import { urlApp } from '@/lib/telegram'

describe('urlApp', () => {
  const original = process.env.NEXT_PUBLIC_APP_URL
  afterEach(() => { process.env.NEXT_PUBLIC_APP_URL = original })

  it('quita tabuladores y espacios pegados al secreto', () => {
    process.env.NEXT_PUBLIC_APP_URL = '\thttps://regtrack.vercel.app \n'
    expect(urlApp()).toBe('https://regtrack.vercel.app')
  })

  it('usa la URL de producción si falta o está vacía', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(urlApp()).toBe('https://regtrack.vercel.app')
    process.env.NEXT_PUBLIC_APP_URL = '  '
    expect(urlApp()).toBe('https://regtrack.vercel.app')
  })
})
