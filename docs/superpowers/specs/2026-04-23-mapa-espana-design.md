# Mapa Interactivo de España — Filtro por Región

**Fecha:** 2026-04-23
**Alcance:** Portal suscriptor — página `/alertas`

## Objetivo

Reemplazar el dropdown de `fuente` en la FilterBar por un mapa SVG interactivo de España segmentado por CCAA. El usuario puede clicar una o varias regiones para filtrar las alertas, y clicar "España completa" para filtrar por el BOE (gobierno central).

## Decisiones de diseño

- **Layout:** Mapa a ancho completo encima de la lista de alertas, siempre visible en todos los tamaños de pantalla.
- **Multi-selección:** Sí — se pueden seleccionar varias CCAA simultáneamente.
- **Regiones sin fuente:** Valencia (DOGV), Aragón (BOA) y Castilla-La Mancha (DOCM) aparecen en gris con `cursor: not-allowed` y tooltip "Próximamente". No son clicables.
- **Mobile:** El SVG escala proporcionalmente con `width="100%"` y `viewBox` fijo.
- **Urgencia:** Se mantiene como dropdown separado en la FilterBar (combinable con el filtro de región).

## Archivos

### Nuevos

**`lib/spain-ccaa-paths.ts`**
Exporta un array de regiones:
```ts
type Region = {
  id: string
  nombre: string
  fuente: string | null  // null = deshabilitada
  path: string           // SVG path data
  disabled: boolean
}
```
Incluye una entrada especial `{ id: 'espana', fuente: 'BOE', nombre: 'España (Gobierno central)' }` para el selector de toda España. Este no es un path SVG sino un botón renderizado encima del mapa (pill/badge clicable que activa `fuente=BOE`).

**`components/subscriber/MapaEspaña.tsx`**
Client component. Responsabilidades:
- Renderiza el SVG de España con los paths de cada CCAA
- Lee la selección actual desde `useSearchParams()` (param `fuente`, comma-separated)
- Click en región activa → toggle en la selección
- Click en "España" → limpia CCAA y activa BOE (mutuamente excluyentes)
- Click en región deshabilitada → sin efecto (solo tooltip)
- Actualiza URL con `router.push()` al cambiar selección

### Modificados

**`app/(subscriber)/alertas/page.tsx`**
- Añade `MapaEspaña` encima de `FilterBar`
- Elimina el filtro `fuente` del array `filters` pasado a `FilterBar`
- Actualiza la query Supabase para multi-fuente:
  ```ts
  const fuentes = params.fuente?.split(',').filter(Boolean)
  if (fuentes?.length) query = query.in('fuente', fuentes)
  ```

**`app/components/ui/FilterBar.tsx`**
Sin cambios en el componente. Solo recibe menos filtros desde la page.

## URL params

```
/alertas                          → todas las alertas (sin filtro de fuente)
/alertas?fuente=BOCM              → solo Madrid
/alertas?fuente=BOCM,DOGC         → Madrid + Cataluña
/alertas?fuente=BOE               → solo gobierno central
/alertas?fuente=BOCM&urgencia=alta → Madrid con urgencia alta
```

## Estados visuales de las regiones

| Estado       | Visual                              |
|--------------|-------------------------------------|
| Normal       | `slate-200` (mismo color para todas)|
| Hover        | Tono más intenso                    |
| Seleccionada | `sky-500` con borde destacado       |
| Deshabilitada| Gris claro, `cursor: not-allowed`   |

## Accesibilidad

Cada `<path>` del SVG:
- `role="button"`
- `aria-label="Nombre de la CCAA"`
- `aria-pressed={isSelected}`
- `tabIndex={0}` con handlers de `onKeyDown` (Enter/Space)

## Casos edge

- URL con `fuente` inválida → ignorada silenciosamente (Supabase retorna 0 resultados)
- Sin selección (estado inicial) → sin filtro de fuente, se muestran todas las alertas
- BOE y CCAA son mutuamente excluyentes: seleccionar BOE limpia CCAA y viceversa

## Fuera de scope

- Mapa en el portal admin
- Contadores de alertas por región sobre el mapa
- Animaciones de transición entre selecciones
