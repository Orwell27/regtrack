# Filtro Regiones — Catálogo de Pills

**Goal:** Replace the interactive SVG map with a simple, attractive pill-grid filter for autonomous communities and central government.

**Architecture:** A single client component `FiltroRegiones` replaces `MapaEspaña`. It reads/writes the `fuente` URL param, renders pills from a static region list, and needs no server-side data (stats query removed). The SVG path and centroid data is stripped from the region list since it's no longer needed.

**Tech Stack:** Next.js App Router client component, Tailwind CSS, `useRouter` / `useSearchParams`

---

## Component

**`components/subscriber/FiltroRegiones.tsx`** — replaces `components/subscriber/MapaEspaña.tsx`

- Wrapped in `<Suspense>` (same pattern as current, required for `useSearchParams`)
- Inner component reads `?fuente` param and exposes `toggleFuente` / `updateFuentes` helpers (identical logic to current)
- No props needed — no `stats`, no server data

## Data

**`lib/regiones.ts`** — replaces the region data currently in `lib/spain-ccaa-paths.ts`

```ts
export type Region = {
  id: string
  nombre: string
  fuente: string
  disabled: boolean
}
```

17 entries, same data as current `REGIONES` minus `path` and `centroid`. `lib/spain-ccaa-paths.ts` can be deleted once the map component is removed.

## Layout

Container: `bg-white border border-slate-200 rounded-lg p-4 mb-4`

```
Filtrar por región

[ 🇪🇸 España (BOE) ] [ Andalucía ] [ Asturias ] [ Islas Baleares ]
[ Canarias ] [ Cantabria ] [ Castilla y León ] [ Cataluña ]
[ Extremadura ] [ Galicia ] [ La Rioja ] [ Comunidad de Madrid ]
[ Murcia ] [ Navarra ] [ País Vasco ]
[ Aragón† ] [ Castilla-La Mancha† ] [ Comunitat Valenciana† ]
```

`†` = disabled pills (visually muted, cursor-not-allowed), always at the end.
BOE is the first pill in the grid, not a separate header button.
CCAA enabled pills are ordered alphabetically by nombre.

Active filter pills row below (unchanged from current implementation).

## Pill States

| State | Classes |
|-------|---------|
| Selected | `bg-sky-500 text-white border-sky-500` |
| Unselected | `border-slate-300 text-slate-600 hover:bg-slate-50` |
| Disabled | `border-slate-200 text-slate-300 cursor-not-allowed` + `title="Próximamente"` |

Base classes for all pills: `text-xs px-3 py-1 rounded-full border transition-colors`

## Toggle Behavior

Identical to current:
- BOE: exclusive toggle (selecting BOE clears all CCAA, selecting any CCAA clears BOE)
- CCAA: multi-select
- URL param: `?fuente=BOJA,BOCM,...`

## Changes to `alertas/page.tsx`

- Remove stats query (the `countByFuente` / `todayFuentes` / `maxCount` computation block)
- Replace `<MapaEspaña stats={mapStats} />` with `<FiltroRegiones />`

## Files to Delete

- `lib/spain-ccaa-paths.ts` (SVG path data, no longer needed)
- `lib/heatmap.ts` (color computation, no longer needed)
- `lib/__tests__/heatmap.test.ts`
- `components/subscriber/MapaEspaña.tsx`
