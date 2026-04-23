# Mapa Interactivo de España — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `fuente` dropdown in `/alertas` with an interactive SVG map of Spain where users click CCAA regions to filter alerts (multi-select), and a pill button selects the BOE (gobierno central).

**Architecture:** Static SVG path data in `lib/spain-ccaa-paths.ts` feeds a client component `MapaEspaña` that syncs selection state with URL search params (`fuente=BOCM,DOGC`). The Server Component page reads the param, splits by comma, and queries Supabase with `.in('fuente', fuentes)`.

**Tech Stack:** Next.js 16 App Router, React (client component), Tailwind CSS v4, SVG, Supabase, vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/spain-ccaa-paths.ts` | Create | Static SVG path data + CCAA→fuente mapping |
| `lib/__tests__/spain-ccaa-paths.test.ts` | Create | Data integrity tests |
| `components/subscriber/MapaEspaña.tsx` | Create | Interactive SVG map client component |
| `app/(subscriber)/alertas/__tests__/query.test.ts` | Create | Fuente filter logic tests |
| `app/(subscriber)/alertas/page.tsx` | Modify | Integrate map, remove fuente dropdown, update query |

---

### Task 1: Obtener el SVG y crear los path data

**Files:**
- Create: `lib/spain-ccaa-paths.ts`
- Create: `lib/__tests__/spain-ccaa-paths.test.ts`

- [ ] **Step 1.1: Descargar el SVG fuente de Wikipedia Commons**

Abre en el navegador y guarda el SVG:
```
https://commons.wikimedia.org/wiki/File:Blank_map_of_Spain_(with_Canary_Islands)_-_Comunidades_autonomas.svg
```

Haz clic en "Original file" para descargar el SVG raw. Ábrelo en un editor de texto y localiza los elementos `<path>`. Cada uno tiene un atributo `id` con el nombre de la comunidad y un atributo `d` con el path data.

Toma nota del atributo `viewBox` del elemento `<svg>` raíz — lo necesitarás en Task 2.

- [ ] **Step 1.2: Escribir el test primero**

```ts
// lib/__tests__/spain-ccaa-paths.test.ts
import { describe, it, expect } from 'vitest'
import { REGIONES, FUENTE_TO_REGION } from '../spain-ccaa-paths'

// BOE no tiene path SVG — es un botón pill en el componente, no una región del mapa
const FUENTES_CCAA = [
  'BOCM', 'DOGC', 'BORM', 'BOJA', 'BOIB',
  'BOC_CANARIAS', 'BOC_CANTABRIA', 'BOCYL', 'DOE',
  'DOG', 'BOPV', 'BOPA', 'BON', 'BOR',
]

describe('spain-ccaa-paths', () => {
  it('has a region for every active CCAA fuente', () => {
    const fuentes = REGIONES.map(r => r.fuente)
    for (const f of FUENTES_CCAA) {
      expect(fuentes).toContain(f)
    }
  })

  it('has disabled regions for Valencia, Aragón, Castilla-La Mancha', () => {
    const disabled = REGIONES.filter(r => r.disabled).map(r => r.id)
    expect(disabled).toContain('valencia')
    expect(disabled).toContain('aragon')
    expect(disabled).toContain('castilla-la-mancha')
  })

  it('FUENTE_TO_REGION maps every CCAA fuente to a region id', () => {
    for (const f of FUENTES_CCAA) {
      expect(FUENTE_TO_REGION[f]).toBeDefined()
    }
  })

  it('every region has a non-empty path string', () => {
    for (const r of REGIONES) {
      expect(typeof r.path).toBe('string')
      expect(r.path.length).toBeGreaterThan(10)
    }
  })
})
```

- [ ] **Step 1.3: Run test — verificar que falla**

```bash
npx vitest run lib/__tests__/spain-ccaa-paths.test.ts
```
Expected: FAIL con "Cannot find module '../spain-ccaa-paths'"

- [ ] **Step 1.4: Crear `lib/spain-ccaa-paths.ts`**

Extrae los `d` attributes de cada `<path>` del SVG descargado en Step 1.1 y rellena cada `PATH_DATA_*`:

```ts
// lib/spain-ccaa-paths.ts
export type Region = {
  id: string
  nombre: string
  fuente: string
  path: string
  disabled: boolean
}

export const REGIONES: Region[] = [
  { id: 'andalucia',          nombre: 'Andalucía',            fuente: 'BOJA',          disabled: false, path: 'PATH_DATA_ANDALUCIA' },
  { id: 'aragon',             nombre: 'Aragón',               fuente: 'BOA',           disabled: true,  path: 'PATH_DATA_ARAGON' },
  { id: 'asturias',           nombre: 'Asturias',             fuente: 'BOPA',          disabled: false, path: 'PATH_DATA_ASTURIAS' },
  { id: 'baleares',           nombre: 'Islas Baleares',       fuente: 'BOIB',          disabled: false, path: 'PATH_DATA_BALEARES' },
  { id: 'canarias',           nombre: 'Canarias',             fuente: 'BOC_CANARIAS',  disabled: false, path: 'PATH_DATA_CANARIAS' },
  { id: 'cantabria',          nombre: 'Cantabria',            fuente: 'BOC_CANTABRIA', disabled: false, path: 'PATH_DATA_CANTABRIA' },
  { id: 'castilla-la-mancha', nombre: 'Castilla-La Mancha',   fuente: 'DOCM',          disabled: true,  path: 'PATH_DATA_CLM' },
  { id: 'castilla-y-leon',    nombre: 'Castilla y León',      fuente: 'BOCYL',         disabled: false, path: 'PATH_DATA_CYL' },
  { id: 'cataluna',           nombre: 'Cataluña',             fuente: 'DOGC',          disabled: false, path: 'PATH_DATA_CATALUNA' },
  { id: 'extremadura',        nombre: 'Extremadura',          fuente: 'DOE',           disabled: false, path: 'PATH_DATA_EXTREMADURA' },
  { id: 'galicia',            nombre: 'Galicia',              fuente: 'DOG',           disabled: false, path: 'PATH_DATA_GALICIA' },
  { id: 'la-rioja',           nombre: 'La Rioja',             fuente: 'BOR',           disabled: false, path: 'PATH_DATA_LARIOJA' },
  { id: 'madrid',             nombre: 'Comunidad de Madrid',  fuente: 'BOCM',          disabled: false, path: 'PATH_DATA_MADRID' },
  { id: 'murcia',             nombre: 'Murcia',               fuente: 'BORM',          disabled: false, path: 'PATH_DATA_MURCIA' },
  { id: 'navarra',            nombre: 'Navarra',              fuente: 'BON',           disabled: false, path: 'PATH_DATA_NAVARRA' },
  { id: 'pais-vasco',         nombre: 'País Vasco',           fuente: 'BOPV',          disabled: false, path: 'PATH_DATA_PAISVASCO' },
  { id: 'valencia',           nombre: 'Comunitat Valenciana', fuente: 'DOGV',          disabled: true,  path: 'PATH_DATA_VALENCIA' },
]

export const FUENTE_TO_REGION: Record<string, string> = Object.fromEntries(
  REGIONES.map(r => [r.fuente, r.id])
)
```

> **Nota:** `BOE` no tiene path SVG propio — se implementa como botón pill en el componente (Task 2). No necesita entrada en `REGIONES`.

- [ ] **Step 1.5: Run test — verificar que pasa**

```bash
npx vitest run lib/__tests__/spain-ccaa-paths.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 1.6: Commit**

```bash
git add lib/spain-ccaa-paths.ts lib/__tests__/spain-ccaa-paths.test.ts
git commit -m "feat: add Spain CCAA SVG path data"
```

---

### Task 2: Componente `MapaEspaña`

**Files:**
- Create: `components/subscriber/MapaEspaña.tsx`

- [ ] **Step 2.1: Crear el componente**

```tsx
// components/subscriber/MapaEspaña.tsx
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { REGIONES } from '@/lib/spain-ccaa-paths'

export function MapaEspaña() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedFuentes = searchParams.get('fuente')?.split(',').filter(Boolean) ?? []

  const updateFuentes = useCallback((fuentes: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (fuentes.length > 0) {
      params.set('fuente', fuentes.join(','))
    } else {
      params.delete('fuente')
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const toggleFuente = useCallback((fuente: string) => {
    if (fuente === 'BOE') {
      updateFuentes(selectedFuentes.includes('BOE') ? [] : ['BOE'])
      return
    }
    const withoutBoe = selectedFuentes.filter(f => f !== 'BOE')
    const isSelected = withoutBoe.includes(fuente)
    updateFuentes(isSelected ? withoutBoe.filter(f => f !== fuente) : [...withoutBoe, fuente])
  }, [selectedFuentes, updateFuentes])

  const isBoeSelected = selectedFuentes.includes('BOE')

  // Replace VIEWBOX with the viewBox value from the SVG downloaded in Task 1
  const VIEWBOX = '0 0 800 600'

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Filtrar por región
        </span>
        <button
          onClick={() => toggleFuente('BOE')}
          aria-pressed={isBoeSelected}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            isBoeSelected
              ? 'bg-sky-500 text-white border-sky-500'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🇪🇸 España (Gobierno central / BOE)
        </button>
      </div>

      <svg
        viewBox={VIEWBOX}
        width="100%"
        className="block"
        aria-label="Mapa de España por comunidades autónomas"
      >
        {REGIONES.map(region => {
          const isSelected = selectedFuentes.includes(region.fuente)
          return (
            <path
              key={region.id}
              d={region.path}
              role={region.disabled ? undefined : 'button'}
              aria-label={region.nombre}
              aria-pressed={region.disabled ? undefined : isSelected}
              tabIndex={region.disabled ? -1 : 0}
              onClick={() => !region.disabled && toggleFuente(region.fuente)}
              onKeyDown={e => {
                if (!region.disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  toggleFuente(region.fuente)
                }
              }}
              strokeWidth="1"
              className={[
                'transition-colors',
                region.disabled
                  ? 'fill-slate-100 stroke-slate-200 cursor-not-allowed'
                  : isSelected
                  ? 'fill-sky-400 stroke-sky-600 cursor-pointer'
                  : 'fill-slate-200 stroke-slate-400 cursor-pointer hover:fill-slate-300',
              ].join(' ')}
            >
              <title>
                {region.disabled
                  ? `${region.nombre} — Próximamente`
                  : region.nombre}
              </title>
            </path>
          )
        })}
      </svg>

      {selectedFuentes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {selectedFuentes.map(fuente => {
            const region = REGIONES.find(r => r.fuente === fuente)
            const label = fuente === 'BOE' ? 'España (BOE)' : (region?.nombre ?? fuente)
            return (
              <span
                key={fuente}
                className="inline-flex items-center gap-1 text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full"
              >
                {label}
                <button
                  onClick={() => toggleFuente(fuente)}
                  className="hover:text-sky-900 leading-none"
                  aria-label={`Quitar ${label}`}
                >
                  ×
                </button>
              </span>
            )
          })}
          <button
            onClick={() => updateFuentes([])}
            className="text-xs text-slate-400 hover:text-slate-600 px-1"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2.2: Verificar que TypeScript compila sin errores**

```bash
npx tsc --noEmit
```
Expected: Sin errores.

- [ ] **Step 2.3: Commit**

```bash
git add components/subscriber/MapaEspaña.tsx
git commit -m "feat: add MapaEspaña interactive SVG component"
```

---

### Task 3: Integrar en la página de alertas

**Files:**
- Create: `app/(subscriber)/alertas/__tests__/query.test.ts`
- Modify: `app/(subscriber)/alertas/page.tsx`

- [ ] **Step 3.1: Escribir el test de la lógica de filtrado**

```ts
// app/(subscriber)/alertas/__tests__/query.test.ts
import { describe, it, expect } from 'vitest'

function parseFuentes(param: string | undefined): string[] {
  if (!param) return []
  return param.split(',').filter(Boolean)
}

describe('parseFuentes', () => {
  it('returns empty array when param is undefined', () => {
    expect(parseFuentes(undefined)).toEqual([])
  })

  it('returns single fuente as array', () => {
    expect(parseFuentes('BOCM')).toEqual(['BOCM'])
  })

  it('returns multiple fuentes as array', () => {
    expect(parseFuentes('BOCM,DOGC,BOJA')).toEqual(['BOCM', 'DOGC', 'BOJA'])
  })

  it('filters empty strings from malformed param', () => {
    expect(parseFuentes('BOCM,,DOGC')).toEqual(['BOCM', 'DOGC'])
  })
})
```

- [ ] **Step 3.2: Run test — verificar que falla**

```bash
npx vitest run "app/(subscriber)/alertas/__tests__/query.test.ts"
```
Expected: FAIL con "Cannot find module"

- [ ] **Step 3.3: Actualizar `app/(subscriber)/alertas/page.tsx`**

Reemplaza el contenido completo del archivo:

```tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { AlertaCard } from '@/app/components/ui/AlertaCard'
import { FilterBar } from '@/app/components/ui/FilterBar'
import { MapaEspaña } from '@/components/subscriber/MapaEspaña'

export const dynamic = 'force-dynamic'

type SearchParams = { fuente?: string; urgencia?: string; page?: string }

const PAGE_SIZE = 20

export default async function SubscriberAlertasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [user, params] = await Promise.all([getAuthUser(), searchParams])

  if (!user) redirect('/login')

  const page = parseInt(params.page ?? '1') - 1
  const fuentes = params.fuente?.split(',').filter(Boolean)
  const db = createNextServerClient()

  let query = db
    .from('alertas')
    .select('*', { count: 'exact' })
    .eq('estado', 'enviada')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (fuentes?.length) query = query.in('fuente', fuentes)
  if (params.urgencia && params.urgencia !== 'all') query = query.eq('urgencia', params.urgencia)

  const { data: alertas, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Mis alertas</h1>
        <p className="text-sm text-slate-400">{count ?? 0} alertas</p>
      </div>

      <MapaEspaña />

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: 'urgencia',
              placeholder: 'Urgencia',
              options: [
                { value: 'alta', label: 'Alta' },
                { value: 'media', label: 'Media' },
                { value: 'baja', label: 'Baja' },
              ],
            },
          ]}
        />
      </div>

      {!alertas?.length ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-400 text-sm">No hay alertas disponibles todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map(alerta => (
            <AlertaCard key={alerta.id} alerta={alerta} plan={user.plan} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`?${new URLSearchParams({ ...params, page: String(p) })}`}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                p === page + 1
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3.4: Run tests**

```bash
npx vitest run "app/(subscriber)/alertas/__tests__/query.test.ts"
```
Expected: PASS (4 tests)

- [ ] **Step 3.5: Run full test suite**

```bash
npx vitest run
```
Expected: Todos los tests pasan, sin regresiones.

- [ ] **Step 3.6: Verificar en el browser**

Con el dev server corriendo en `http://localhost:3000`, navega a `/alertas`. Verifica:
- El mapa aparece encima de las alertas
- Clicar una región carga alertas de esa CCAA
- Clicar varias regiones filtra por todas (multi-select)
- Clicar "España (Gobierno central / BOE)" filtra por BOE y deselecciona CCAA
- Las 3 CCAA deshabilitadas (Valencia, Aragón, Castilla-La Mancha) aparecen grises y no son clicables
- El filtro de urgencia sigue funcionando combinado con el mapa
- Los chips de selección activa muestran los nombres y el botón × funciona
- "Limpiar todo" resetea los filtros

- [ ] **Step 3.7: Commit final**

```bash
git add "app/(subscriber)/alertas/page.tsx" "app/(subscriber)/alertas/__tests__/query.test.ts"
git commit -m "feat: integrate MapaEspaña into alertas page with multi-fuente filter"
```
