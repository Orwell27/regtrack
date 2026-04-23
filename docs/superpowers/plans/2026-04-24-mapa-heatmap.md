# Mapa Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the Spain map with three data layers: terracota heatmap by alert volume, numeric counter per region, and a yellow pulsing dot for regions with alerts sent today.

**Architecture:** Pure `getHeatColor` function in `lib/heatmap.ts`; centroid coordinates added to each region in `lib/spain-ccaa-paths.ts`; `MapaEspaña` receives a `MapStats` prop (passed from the Server Component `alertas/page.tsx`) and renders SVG overlays. No new API routes.

**Tech Stack:** Next.js 16 App Router (Server Component query), React SVG overlays, Tailwind CSS v4, Supabase, Vitest

**Branch / worktree:** `feature/mapa-espana` at `.worktrees/feature/mapa-espana`
All commands must be run from that directory.

---

### Task 1: `getHeatColor` pure function (TDD)

**Files:**
- Create: `lib/heatmap.ts`
- Create: `lib/__tests__/heatmap.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/heatmap.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
npx vitest run lib/__tests__/heatmap.test.ts
```

Expected: `Error: Cannot find module '../heatmap'`

- [ ] **Step 3: Implement `lib/heatmap.ts`**

```ts
/**
 * Returns a terracota fill color for the map heatmap.
 * @param count  Number of alertas for this region
 * @param max    Maximum count across all regions (must be >= 1)
 */
export function getHeatColor(count: number, max: number): string {
  if (!count) return '#f1f5f9'
  const ratio = count / max
  if (ratio < 0.2)  return '#fed7aa'
  if (ratio < 0.4)  return '#fb923c'
  if (ratio < 0.65) return '#ea580c'
  if (ratio < 0.85) return '#c2410c'
  return '#9a3412'
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run lib/__tests__/heatmap.test.ts
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/heatmap.ts lib/__tests__/heatmap.test.ts
git commit -m "feat: add getHeatColor pure function with tests"
```

---

### Task 2: Add centroids to `lib/spain-ccaa-paths.ts`

**Files:**
- Modify: `lib/spain-ccaa-paths.ts`
- Create: `lib/__tests__/spain-ccaa-paths.test.ts`

**Context:** The SVG viewBox is `"0 0 613 544"`. Each centroid is a `[x, y]` point in that coordinate space.

- [ ] **Step 1: Write the failing centroid integrity test**

Create `lib/__tests__/spain-ccaa-paths.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { REGIONES } from '../spain-ccaa-paths'

describe('REGIONES centroids', () => {
  it('every region has a centroid array with two numbers', () => {
    for (const r of REGIONES) {
      expect(Array.isArray(r.centroid), `${r.id} missing centroid`).toBe(true)
      expect(r.centroid).toHaveLength(2)
      expect(typeof r.centroid[0]).toBe('number')
      expect(typeof r.centroid[1]).toBe('number')
    }
  })

  it('all centroids are within the viewBox bounds (0 0 613 544)', () => {
    for (const r of REGIONES) {
      const [x, y] = r.centroid
      expect(x, `${r.id} x out of bounds`).toBeGreaterThanOrEqual(0)
      expect(x, `${r.id} x out of bounds`).toBeLessThanOrEqual(613)
      expect(y, `${r.id} y out of bounds`).toBeGreaterThanOrEqual(0)
      expect(y, `${r.id} y out of bounds`).toBeLessThanOrEqual(544)
    }
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (type error)**

```bash
npx vitest run lib/__tests__/spain-ccaa-paths.test.ts
```

Expected: TypeScript error or runtime error — `centroid` does not exist on `Region`

- [ ] **Step 3: Add `centroid` to the `Region` type**

In `lib/spain-ccaa-paths.ts`, replace:

```ts
export type Region = {
  id: string
  nombre: string
  fuente: string
  path: string
  disabled: boolean
}
```

With:

```ts
export type Region = {
  id: string
  nombre: string
  fuente: string
  path: string
  disabled: boolean
  centroid: [number, number]
}
```

- [ ] **Step 4: Add `centroid` to each of the 17 region entries**

Add the `centroid` field to each region object in the `REGIONES` array. Use the coordinates below (estimated visual centers in the `0 0 613 544` viewBox):

| id | centroid |
|----|---------|
| `andalucia` | `[285, 415]` |
| `aragon` | `[455, 150]` |
| `asturias` | `[215, 35]` |
| `baleares` | `[545, 195]` |
| `canarias` | `[75, 520]` |
| `cantabria` | `[320, 28]` |
| `castilla-la-mancha` | `[360, 325]` |
| `castilla-y-leon` | `[235, 185]` |
| `cataluna` | `[510, 110]` |
| `extremadura` | `[168, 330]` |
| `galicia` | `[95, 85]` |
| `la-rioja` | `[385, 80]` |
| `madrid` | `[310, 262]` |
| `murcia` | `[430, 390]` |
| `navarra` | `[418, 60]` |
| `pais-vasco` | `[370, 38]` |
| `valencia` | `[490, 285]` |

For example, the `andalucia` entry should look like:

```ts
{
  id: 'andalucia',
  nombre: 'Andalucía',
  fuente: 'BOJA',
  path: 'm 438.39514,...',
  disabled: false,
  centroid: [285, 415],
},
```

Add `centroid: [x, y],` to each of the 17 entries following the same pattern.

- [ ] **Step 5: Run test — expect PASS**

```bash
npx vitest run lib/__tests__/spain-ccaa-paths.test.ts
```

Expected: `2 passed`

- [ ] **Step 6: Run full test suite — expect all PASS**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add lib/spain-ccaa-paths.ts lib/__tests__/spain-ccaa-paths.test.ts
git commit -m "feat: add centroid coordinates to all CCAA regions"
```

---

### Task 3: Update `MapaEspaña` to render heatmap, counter, and pulsing dot

**Files:**
- Modify: `components/subscriber/MapaEspaña.tsx`

**Context:** `MapaEspaña` is a Client Component with two functions:
- `MapaEspañaInner` — inner function using `useSearchParams` (must stay a Client Component)
- `MapaEspaña` — exported wrapper that wraps `MapaEspañaInner` in `<Suspense>`

The `stats` prop is passed from the Server Component page; both functions need it.

- [ ] **Step 1: Add the `MapStats` type and update function signatures**

At the top of `components/subscriber/MapaEspaña.tsx`, add the import and type after the existing imports:

```ts
import { getHeatColor } from '@/lib/heatmap'

type MapStats = {
  countByFuente: Record<string, number>
  todayFuentes: string[]
  maxCount: number
}
```

Update the two function signatures:

```ts
function MapaEspañaInner({ stats }: { stats: MapStats }) {
```

```ts
export function MapaEspaña({ stats }: { stats: MapStats }) {
  return (
    <Suspense fallback={<div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 h-48 animate-pulse" />}>
      <MapaEspañaInner stats={stats} />
    </Suspense>
  )
}
```

- [ ] **Step 2: Replace the SVG map rendering with heatmap + overlays**

Find the `{REGIONES.map(region => {` block inside `MapaEspañaInner`. Replace the entire `{REGIONES.map(...)}` section (currently renders one `<path>` per region) with the following:

```tsx
{REGIONES.map(region => {
  const count = stats.countByFuente[region.fuente] ?? 0
  const isSelected = selectedFuentes.includes(region.fuente)
  const ratio = stats.maxCount > 0 ? count / stats.maxCount : 0
  const textColor = isSelected
    ? '#ffffff'
    : ratio >= 0.4
    ? '#ffffff'
    : '#7c2d12'

  return (
    <g key={region.id}>
      <path
        d={region.path}
        role={region.disabled ? undefined : 'button'}
        aria-hidden={region.disabled ? true : undefined}
        aria-label={region.disabled ? undefined : region.nombre}
        aria-pressed={region.disabled ? undefined : isSelected}
        tabIndex={region.disabled ? -1 : 0}
        onClick={region.disabled ? undefined : () => toggleFuente(region.fuente)}
        onKeyDown={region.disabled ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleFuente(region.fuente)
          }
        }}
        strokeWidth="1"
        style={
          !region.disabled && !isSelected && count > 0
            ? { fill: getHeatColor(count, stats.maxCount) }
            : undefined
        }
        className={[
          'transition-colors',
          region.disabled
            ? 'fill-slate-100 stroke-slate-200 cursor-not-allowed'
            : isSelected
            ? 'fill-sky-400 stroke-sky-600 cursor-pointer'
            : count === 0
            ? 'fill-slate-200 stroke-slate-400 cursor-pointer hover:fill-slate-300'
            : 'stroke-slate-400 cursor-pointer',
        ].join(' ')}
      >
        <title>
          {region.disabled
            ? `${region.nombre} — Próximamente`
            : region.nombre}
        </title>
      </path>

      {/* Region name label */}
      <text
        x={region.centroid[0]}
        y={region.centroid[1] - 6}
        textAnchor="middle"
        fontSize="6"
        fontWeight="600"
        fill={textColor}
        pointerEvents="none"
      >
        {region.nombre.toUpperCase()}
      </text>

      {/* Alert count */}
      {!region.disabled && count > 0 && (
        <text
          x={region.centroid[0]}
          y={region.centroid[1] + 6}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill={textColor}
          pointerEvents="none"
        >
          {count}
        </text>
      )}

      {/* Mini progress bar */}
      {!region.disabled && count > 0 && (
        <g pointerEvents="none">
          <rect
            x={region.centroid[0] - 15}
            y={region.centroid[1] + 10}
            width="30"
            height="3"
            rx="1.5"
            fill="rgba(0,0,0,0.15)"
          />
          <rect
            x={region.centroid[0] - 15}
            y={region.centroid[1] + 10}
            width={30 * ratio}
            height="3"
            rx="1.5"
            fill="rgba(255,255,255,0.7)"
          />
        </g>
      )}

      {/* Pulsing dot — today activity */}
      {!region.disabled && stats.todayFuentes.includes(region.fuente) && (
        <g pointerEvents="none">
          <circle
            cx={region.centroid[0] + 18}
            cy={region.centroid[1] - 18}
            r="4"
            fill="#fef08a"
          />
          <circle
            cx={region.centroid[0] + 18}
            cy={region.centroid[1] - 18}
            r="4"
            fill="#fef08a"
            opacity="0.5"
          >
            <animate attributeName="r" from="4" to="9" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </g>
  )
})}
```

- [ ] **Step 3: Build check — confirm no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/subscriber/MapaEspaña.tsx
git commit -m "feat: add heatmap overlays, counters and pulsing dot to MapaEspaña"
```

---

### Task 4: Add stats query to `alertas/page.tsx` and pass to `MapaEspaña`

**Files:**
- Modify: `app/(subscriber)/alertas/page.tsx`

- [ ] **Step 1: Add the stats query after the main alertas query**

In `app/(subscriber)/alertas/page.tsx`, after the line:

```ts
const { data: alertas, count } = await query
```

Add:

```ts
// Stats for heatmap — all-time sent alerts
const { data: statsData } = await db
  .from('alertas')
  .select('fuente, created_at')
  .eq('estado', 'enviada')

const todayMidnight = new Date()
todayMidnight.setHours(0, 0, 0, 0)

const countByFuente = statsData?.reduce((acc, a) => {
  acc[a.fuente] = (acc[a.fuente] ?? 0) + 1
  return acc
}, {} as Record<string, number>) ?? {}

const todayFuentes = [
  ...new Set(
    statsData
      ?.filter(a => new Date(a.created_at) >= todayMidnight)
      .map(a => a.fuente) ?? []
  ),
]

const maxCount = Math.max(...Object.values(countByFuente), 1)

const stats = { countByFuente, todayFuentes, maxCount }
```

- [ ] **Step 2: Pass `stats` to `<MapaEspaña>`**

Find:

```tsx
<MapaEspaña />
```

Replace with:

```tsx
<MapaEspaña stats={stats} />
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add app/\(subscriber\)/alertas/page.tsx
git commit -m "feat: query alert stats and pass to MapaEspaña for heatmap"
```

---

## Self-Review

**Spec coverage:**
- ✅ `getHeatColor` function with 5-level terracota palette — Task 1
- ✅ Tests for all 5 spec cases — Task 1
- ✅ `centroid: [number, number]` on Region type and all 17 entries — Task 2
- ✅ Centroid integrity test (exists + in-bounds) — Task 2
- ✅ `MapStats` type with `countByFuente`, `todayFuentes`, `maxCount` — Task 3
- ✅ Heatmap fill via `style={{ fill: getHeatColor(...) }}` — Task 3
- ✅ Name label (`<text>` at centroid - 6) — Task 3
- ✅ Count label (`<text>` at centroid + 6) — Task 3
- ✅ Mini progress bar — Task 3
- ✅ Pulsing yellow dot (`todayFuentes.includes`) — Task 3
- ✅ Text color rule: selected or ratio ≥ 0.4 → white; else `#7c2d12` — Task 3
- ✅ Disabled regions: no heatmap, no counter, no dot — Task 3 (guards on `!region.disabled`)
- ✅ Selected region: sky-400 overrides heatmap; counter + dot still visible — Task 3 (style only applied when `!isSelected`)
- ✅ Stats query (all-time `estado='enviada'`) — Task 4
- ✅ `todayFuentes` uses midnight cutoff — Task 4
- ✅ `maxCount = Math.max(..., 1)` prevents division by zero — Task 4
- ✅ Stats query failure edge case: `?? {}` and `?? []` defaults ensure page doesn't break — Task 4

**Placeholder scan:** None found.

**Type consistency:**
- `MapStats` defined in Task 3 (`MapaEspaña.tsx`) — used in Tasks 3 and 4 with matching property names
- `getHeatColor(count, stats.maxCount)` — matches signature `(count: number, max: number)` from Task 1
- `region.centroid` — added in Task 2, used in Task 3
- `todayFuentes` is `string[]` throughout (no Set)
