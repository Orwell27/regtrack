# Mapa Heatmap — Contador e Indicador de Actividad

**Fecha:** 2026-04-24
**Alcance:** Portal suscriptor — componente `MapaEspaña` + página `/alertas`

## Objetivo

Enriquecer el mapa interactivo de España con tres capas de información visual sobre el volumen de alertas por CCAA:
1. **Heatmap** — intensidad de color terracota proporcional al número total de alertas enviadas por región
2. **Contador** — número de alertas visible en el centro de cada región
3. **Indicador pulsante** — punto amarillo animado en regiones con alertas creadas hoy (desde medianoche)

## Decisiones de diseño

- **Ventana de tiempo para el heatmap/contador:** Todas las alertas `estado = 'enviada'` (histórico completo)
- **Ventana de tiempo para el indicador:** Alertas con `created_at >= hoy a medianoche` (hora local del servidor)
- **Paleta:** Terracota en 5 niveles (`#f1f5f9` → `#fed7aa` → `#fb923c` → `#ea580c` → `#c2410c` → `#9a3412`)
- **Indicador:** Círculo amarillo `#fef08a` con animación SVG pulse en la esquina del centroide
- **Regiones deshabilitadas** (Valencia, Aragón, CLM): sin heatmap, sin contador, sin dot — mantienen `#f1f5f9`
- **Conflicto selección + heatmap:** el color de selección (`sky-400`) sobreescribe el heatmap; contador y dot siguen visibles
- **Arquitectura de datos:** Server Component query — sin endpoints adicionales

## Archivos

### Nuevos

**`lib/heatmap.ts`**
Función pura exportable:
```ts
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

**`lib/__tests__/heatmap.test.ts`**
Tests:
- `getHeatColor(0, 10)` → `'#f1f5f9'`
- `getHeatColor(10, 10)` → `'#9a3412'`
- `getHeatColor(5, 10)` → `'#ea580c'`
- `getHeatColor(1, 1)` → `'#9a3412'`
- `getHeatColor(2, 10)` → `'#fed7aa'`

### Modificados

**`lib/spain-ccaa-paths.ts`**
Añadir campo `centroid: [number, number]` al tipo `Region` y a cada una de las 17 entradas. Coordenadas en el espacio `viewBox="0 0 613 544"`. El implementador debe estimar/calcular visualmente el centro geográfico de cada path.

**`components/subscriber/MapaEspaña.tsx`**
Añadir prop:
```ts
type MapStats = {
  countByFuente: Record<string, number>
  todayFuentes: string[]   // array serializable (no Set)
  maxCount: number
}

type Props = { stats: MapStats }
```

Por cada región en el SVG, añadir (sobre el `<path>` existente):
```tsx
{/* Color heatmap — solo si no deshabilitada y no seleccionada */}
<path ... style={{ fill: !region.disabled && !isSelected ? getHeatColor(count, stats.maxCount) : undefined }} />

{/* Etiqueta nombre */}
<text x={region.centroid[0]} y={region.centroid[1] - 6}
  textAnchor="middle" fontSize="6" fontWeight="600"
  fill={textColor} pointerEvents="none">
  {region.nombre.toUpperCase()}
</text>

{/* Contador */}
<text x={region.centroid[0]} y={region.centroid[1] + 6}
  textAnchor="middle" fontSize="9" fontWeight="700"
  fill={textColor} pointerEvents="none">
  {count > 0 ? count : ''}
</text>

{/* Barra de progreso mini */}
{count > 0 && (
  <g pointerEvents="none">
    <rect x={region.centroid[0] - 15} y={region.centroid[1] + 10}
      width="30" height="3" rx="1.5" fill="rgba(0,0,0,0.15)" />
    <rect x={region.centroid[0] - 15} y={region.centroid[1] + 10}
      width={30 * (count / stats.maxCount)} height="3" rx="1.5"
      fill="rgba(255,255,255,0.7)" />
  </g>
)}

{/* Indicador pulsante */}
{stats.todayFuentes.includes(region.fuente) && !region.disabled && (
  <g pointerEvents="none">
    <circle cx={region.centroid[0] + 18} cy={region.centroid[1] - 18} r="4" fill="#fef08a" />
    <circle cx={region.centroid[0] + 18} cy={region.centroid[1] - 18} r="4" fill="#fef08a" opacity="0.5">
      <animate attributeName="r" from="4" to="9" dur="1.2s" repeatCount="indefinite" />
      <animate attributeName="opacity" from="0.5" to="0" dur="1.2s" repeatCount="indefinite" />
    </circle>
  </g>
)}
```

**Color del texto:** `count / maxCount >= 0.4` → blanco `#ffffff`; `count / maxCount < 0.4` o `count === 0` → terracota oscuro `#7c2d12`. Para regiones seleccionadas (sky-400), usar siempre blanco.

**`app/(subscriber)/alertas/page.tsx`**
Añadir query de stats tras la query principal:
```ts
const todayMidnight = new Date()
todayMidnight.setHours(0, 0, 0, 0)

const { data: statsData } = await db
  .from('alertas')
  .select('fuente, created_at')
  .eq('estado', 'enviada')

const countByFuente = statsData?.reduce((acc, a) => {
  acc[a.fuente] = (acc[a.fuente] ?? 0) + 1
  return acc
}, {} as Record<string, number>) ?? {}

const todayFuentes = [
  ...new Set(
    statsData
      ?.filter(a => new Date(a.created_at) >= todayMidnight)
      .map(a => a.fuente) ?? []
  )
]

const maxCount = Math.max(...Object.values(countByFuente), 1)

const stats = { countByFuente, todayFuentes, maxCount }
```

Pasar `stats` a `MapaEspaña`:
```tsx
<MapaEspaña stats={stats} />
```

## Edge cases

| Caso | Comportamiento |
|------|---------------|
| Región sin alertas (`count = 0`) | Color `#f1f5f9`, sin número, sin barra |
| Solo una región con alertas (`max = 1`) | Color máximo (`#9a3412`) |
| Query de stats falla | `stats` con valores vacíos, mapa sin heatmap — no rompe la página |
| Región seleccionada | Color `sky-400` sobreescribe heatmap; contador y dot visibles igualmente |
| Región deshabilitada | Sin heatmap, sin contador, sin dot |

## Fuera de scope

- Heatmap en el portal admin
- Leyenda visual del heatmap en la UI
- Tooltips con detalle de alertas al hover sobre el dot
- Counts por urgencia (solo total)
