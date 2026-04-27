# Filtro Regiones — Catálogo de Pills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the interactive SVG map filter with a clean pill-grid filter component for autonomous communities and central government.

**Architecture:** Create `lib/regiones.ts` with the region data (no SVG paths), build `components/subscriber/FiltroRegiones.tsx` as a pill-grid client component, update `app/(subscriber)/alertas/page.tsx` to use it (removing the stats query), then delete the now-unused map files.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Vitest

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Create | `lib/regiones.ts` | Static region data (id, nombre, fuente, disabled) |
| Create | `lib/__tests__/regiones.test.ts` | Verify region list shape |
| Create | `components/subscriber/FiltroRegiones.tsx` | Pill-grid filter UI |
| Modify | `app/(subscriber)/alertas/page.tsx` | Swap component, remove stats query |
| Delete | `lib/spain-ccaa-paths.ts` | SVG path data — no longer needed |
| Delete | `lib/heatmap.ts` | Color computation — no longer needed |
| Delete | `lib/__tests__/heatmap.test.ts` | Tests for deleted module |
| Delete | `components/subscriber/MapaEspaña.tsx` | SVG map component — replaced |

---

### Task 1: Create region data module

**Files:**
- Create: `lib/regiones.ts`
- Create: `lib/__tests__/regiones.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/regiones.test.ts
import { describe, it, expect } from 'vitest'
import { REGIONES } from '../regiones'

describe('REGIONES', () => {
  it('has 17 entries', () => {
    expect(REGIONES).toHaveLength(17)
  })

  it('each region has required fields', () => {
    for (const r of REGIONES) {
      expect(typeof r.id).toBe('string')
      expect(typeof r.nombre).toBe('string')
      expect(typeof r.fuente).toBe('string')
      expect(typeof r.disabled).toBe('boolean')
    }
  })

  it('has exactly 3 disabled regions', () => {
    expect(REGIONES.filter(r => r.disabled)).toHaveLength(3)
  })

  it('BOE is not in REGIONES (it is separate)', () => {
    expect(REGIONES.find(r => r.fuente === 'BOE')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- regiones
```

Expected: FAIL — `Cannot find module '../regiones'`

- [ ] **Step 3: Create `lib/regiones.ts`**

```ts
export type Region = {
  id: string
  nombre: string
  fuente: string
  disabled: boolean
}

export const REGIONES: Region[] = [
  { id: 'andalucia',        nombre: 'Andalucía',             fuente: 'BOJA',          disabled: false },
  { id: 'aragon',           nombre: 'Aragón',                fuente: 'BOA',           disabled: true  },
  { id: 'asturias',         nombre: 'Asturias',              fuente: 'BOPA',          disabled: false },
  { id: 'baleares',         nombre: 'Islas Baleares',        fuente: 'BOIB',          disabled: false },
  { id: 'canarias',         nombre: 'Canarias',              fuente: 'BOC_CANARIAS',  disabled: false },
  { id: 'cantabria',        nombre: 'Cantabria',             fuente: 'BOC_CANTABRIA', disabled: false },
  { id: 'castilla-la-mancha', nombre: 'Castilla-La Mancha', fuente: 'DOCM',          disabled: true  },
  { id: 'castilla-y-leon',  nombre: 'Castilla y León',       fuente: 'BOCYL',         disabled: false },
  { id: 'cataluna',         nombre: 'Cataluña',              fuente: 'DOGC',          disabled: false },
  { id: 'extremadura',      nombre: 'Extremadura',           fuente: 'DOE',           disabled: false },
  { id: 'galicia',          nombre: 'Galicia',               fuente: 'DOG',           disabled: false },
  { id: 'la-rioja',         nombre: 'La Rioja',              fuente: 'BOR',           disabled: false },
  { id: 'madrid',           nombre: 'Comunidad de Madrid',   fuente: 'BOCM',          disabled: false },
  { id: 'murcia',           nombre: 'Murcia',                fuente: 'BORM',          disabled: false },
  { id: 'navarra',          nombre: 'Navarra',               fuente: 'BON',           disabled: false },
  { id: 'pais-vasco',       nombre: 'País Vasco',            fuente: 'BOPV',          disabled: false },
  { id: 'valencia',         nombre: 'Comunitat Valenciana',  fuente: 'DOGV',          disabled: true  },
]
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- regiones
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/regiones.ts lib/__tests__/regiones.test.ts
git commit -m "feat: add region data module without SVG path data"
```

---

### Task 2: Build `FiltroRegiones` component

**Files:**
- Create: `components/subscriber/FiltroRegiones.tsx`

No unit tests for this component — it is a pure UI component using `useRouter`/`useSearchParams` (Next.js hooks that require a real browser environment). Visual correctness is verified by running the dev server.

- [ ] **Step 1: Create `components/subscriber/FiltroRegiones.tsx`**

```tsx
'use client'
import { Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { REGIONES } from '@/lib/regiones'

// Enabled CCAA sorted alphabetically, disabled ones at the end
const ENABLED = REGIONES.filter(r => !r.disabled).sort((a, b) =>
  a.nombre.localeCompare(b.nombre, 'es')
)
const DISABLED = REGIONES.filter(r => r.disabled).sort((a, b) =>
  a.nombre.localeCompare(b.nombre, 'es')
)

function FiltroRegionesInner() {
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
    router.replace(`${pathname}?${params.toString()}`)
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

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
        Filtrar por región
      </p>

      <div className="flex flex-wrap gap-2">
        {/* BOE — central government, first pill */}
        <button
          onClick={() => toggleFuente('BOE')}
          aria-pressed={isBoeSelected}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            isBoeSelected
              ? 'bg-sky-500 text-white border-sky-500'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🇪🇸 España (BOE)
        </button>

        {/* Enabled CCAA */}
        {ENABLED.map(region => {
          const isSelected = selectedFuentes.includes(region.fuente)
          return (
            <button
              key={region.id}
              onClick={() => toggleFuente(region.fuente)}
              aria-pressed={isSelected}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                isSelected
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {region.nombre}
            </button>
          )
        })}

        {/* Disabled CCAA — always at end */}
        {DISABLED.map(region => (
          <button
            key={region.id}
            disabled
            title="Próximamente"
            className="text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-300 cursor-not-allowed"
          >
            {region.nombre}
          </button>
        ))}
      </div>

      {/* Active filter pills */}
      {selectedFuentes.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
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

export function FiltroRegiones() {
  return (
    <Suspense fallback={<div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 h-24 animate-pulse" />}>
      <FiltroRegionesInner />
    </Suspense>
  )
}
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

```bash
npm test
```

Expected: all existing tests pass (this step creates no new tests — the component has no unit-testable logic beyond what the regiones module already tests).

- [ ] **Step 3: Verify visually in dev server**

```bash
npm run dev
```

Open `http://localhost:3000/alertas`. The pill grid should render. Click pills — URL should update with `?fuente=...`. Clicking BOE should deselect all CCAA and vice versa. Active pills with × should appear below.

- [ ] **Step 4: Commit**

```bash
git add components/subscriber/FiltroRegiones.tsx
git commit -m "feat: add FiltroRegiones pill-grid filter component"
```

---

### Task 3: Wire `FiltroRegiones` into the alertas page and remove stats query

**Files:**
- Modify: `app/(subscriber)/alertas/page.tsx`

- [ ] **Step 1: Replace the full content of `app/(subscriber)/alertas/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { createNextServerClient } from '@/lib/supabase'
import { AlertaCard } from '@/app/components/ui/AlertaCard'
import { FilterBar } from '@/app/components/ui/FilterBar'
import { FiltroRegiones } from '@/components/subscriber/FiltroRegiones'

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

      <FiltroRegiones />

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

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Verify in dev server**

Open `http://localhost:3000/alertas`. Page should load with pill grid. No TypeScript errors in terminal.

- [ ] **Step 4: Commit**

```bash
git add "app/(subscriber)/alertas/page.tsx"
git commit -m "feat: wire FiltroRegiones into alertas page, remove stats query"
```

---

### Task 4: Delete obsolete files

**Files:**
- Delete: `lib/spain-ccaa-paths.ts`
- Delete: `lib/heatmap.ts`
- Delete: `lib/__tests__/heatmap.test.ts`
- Delete: `components/subscriber/MapaEspaña.tsx`

- [ ] **Step 1: Delete the files**

```bash
git rm lib/spain-ccaa-paths.ts
git rm lib/heatmap.ts
git rm "lib/__tests__/heatmap.test.ts"
git rm "components/subscriber/MapaEspaña.tsx"
```

- [ ] **Step 2: Run full test suite to confirm nothing broke**

```bash
npm test
```

Expected: all tests pass (heatmap tests are gone, no other test imports deleted files).

- [ ] **Step 3: Verify dev server still starts cleanly**

```bash
npm run dev
```

Expected: no `Module not found` errors in terminal.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete SVG map, heatmap, and path data files"
```
