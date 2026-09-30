// tests/api/rutas-con-sesion.test.ts
// Guardián de fuente: cada handler de app/api llama a requireAdmin() o a
// getAuthUser(), salvo las rutas de SIN_SESION, cada una con su motivo.
//
// Qué mide: que nadie añada una ruta sin pensar en la sesión (el middleware no
// cubre /api). Qué NO mide: que la ruta use bien el resultado. Eso lo prueba el
// comportamiento en rutas-admin.test.ts.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import path from 'path'

const RAIZ = path.resolve(__dirname, '../../app/api')

const SIN_SESION: Record<string, string> = {
  'auth/logout/route.ts': 'solo cierra la sesión de quien llama; sin sesión no hace nada',
}

const METODOS = 'GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS'

const sinComentarios = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '')

function rutas(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return rutas(p)
    return e.name === 'route.ts' ? [p] : []
  })
}

const todas = rutas(RAIZ).map(p => path.relative(RAIZ, p).split(path.sep).join('/'))

describe('rutas de app/api', () => {
  it('encuentra las rutas que vigila', () => {
    expect(todas.length, `no encontré route.ts bajo ${RAIZ}: el guardián mira donde no es`).toBeGreaterThan(5)
  })

  it('SIN_SESION solo nombra rutas que existen', () => {
    for (const ruta of Object.keys(SIN_SESION)) {
      expect(existsSync(path.join(RAIZ, ruta)), `${ruta} está en SIN_SESION y ya no existe: quítala`).toBe(true)
    }
  })

  for (const ruta of todas.filter(r => !(r in SIN_SESION))) {
    it(`${ruta}: cada handler comprueba la sesión`, () => {
      const src = sinComentarios(readFileSync(path.join(RAIZ, ruta), 'utf8'))

      expect(
        new RegExp(`export\\s+(const|let|var)\\s+(${METODOS})\\b|export\\s*\\{[^}]*\\b(${METODOS})\\b`).test(src),
        `${ruta}: exporta un handler que no es "export async function": el guardián no sabría vigilarlo`
      ).toBe(false)

      const inicios = [...src.matchAll(new RegExp(`export\\s+async\\s+function\\s+(${METODOS})\\s*\\(`, 'g'))]
      expect(inicios.length, `${ruta}: no encontré ningún handler: el guardián no sabe qué vigilar`).toBeGreaterThan(0)

      inicios.forEach((m, i) => {
        const cuerpo = src.slice(m.index, inicios[i + 1]?.index ?? src.length)
        expect(
          /\b(requireAdmin|getAuthUser)\(\)/.test(cuerpo),
          `${ruta} ${m[1]}: no llama a requireAdmin() ni a getAuthUser(). Si de verdad debe ser pública, añádela a SIN_SESION con el motivo`
        ).toBe(true)
      })
    })
  }
})
