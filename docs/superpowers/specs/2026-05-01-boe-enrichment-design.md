# BOE Enrichment — Diseño

**Fecha:** 2026-05-01
**Estado:** Aprobado

## Objetivo

Enriquecer los items del BOE con metadatos estructurales que actualmente se descartan durante el parsing, y añadir un paso de correlación normativa basado en datos reales del BOE (no inferencia IA).

## Problema actual

El pipeline extrae del BOE únicamente título, URL y texto crudo (8000 chars con tags eliminados). El JSON del sumario contiene `departamento`, `epígrafe` y `rango` que se ignoran. El XML de cada norma contiene un nodo `<referencias>` con las normas que modifica/deroga de forma estructurada, que también se descarta. Como consecuencia:

- `tipo_norma` lo infiere Claude desde texto libre → puede ser incorrecto
- `deroga_modifica` lo infiere Claude desde texto libre → puede ser incorrecto
- La correlación normativa es solo por subtema/territorio, no por referencias formales

## Solución

Tres cambios coordinados:

1. Extraer metadatos del sumario JSON (`departamento`, `epígrafe`, `rango`) sin coste extra.
2. Parsear el nodo `<referencias>` del XML para obtener referencias normativas estructuradas.
3. Añadir un paso ground-truth en el pipeline que crea `alerta_relaciones` directamente cuando una norma referencia a otra ya indexada.

---

## Modelo de datos

### Migración 008

```sql
ALTER TABLE alertas
  ADD COLUMN boe_id          TEXT UNIQUE,
  ADD COLUMN departamento    TEXT,
  ADD COLUMN epigrafe        TEXT,
  ADD COLUMN rango           TEXT,
  ADD COLUMN referencias_boe JSONB DEFAULT '[]';

CREATE INDEX idx_alertas_boe_id ON alertas(boe_id);
```

**Semántica de cada columna:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `boe_id` | TEXT UNIQUE | Identificador oficial BOE (ej: `BOE-A-2024-12345`). NULL para fuentes no-BOE. Indexado para lookup O(1) en correlación. |
| `departamento` | TEXT | Ministerio u organismo emisor según el sumario BOE (ej: "Ministerio de Vivienda y Agenda Urbana"). |
| `epigrafe` | TEXT | Epígrafe temático oficial del BOE (ej: "Arrendamientos urbanos"). Complementa el `subtema` clasificado por Claude. |
| `rango` | TEXT | Tipo de norma declarado por el BOE (ej: "Real Decreto"). Tiene prioridad sobre el `tipo_norma` inferido por Claude. |
| `referencias_boe` | JSONB | Array de referencias a otras normas: `[{ "boe_id": "BOE-A-2013-11682", "tipo": "modifica", "descripcion": "Modifica el artículo 18..." }]` |

### Tipo ReferenciaBOE (TypeScript)

```typescript
interface ReferenciaBOE {
  boe_id: string
  tipo: 'modifica' | 'deroga' | 'complementa' | 'otro'
  descripcion: string
}
```

El mapeo desde los valores del XML del BOE es:
- `MODIFICA` → `modifica`
- `DEROGA` → `deroga`
- `AÑADE` / `AÑADE_UNO` → `complementa`
- Cualquier otro valor → `otro`

Solo `modifica` y `deroga` generan registros en `alerta_relaciones`. Los tipos `complementa` y `otro` se almacenan en el JSONB pero no crean relaciones automáticas.

---

## Cambios en `lib/sources/boe.ts`

### `NormalizedItem`

Añadir campos opcionales:

```typescript
export interface NormalizedItem {
  id: string
  titulo: string
  url: string
  fuente: FuenteEnum
  texto?: string
  _xmlUrl?: string
  // Nuevos (solo BOE):
  boe_id?: string
  departamento?: string
  epigrafe?: string
  rango?: string
  referencias_boe?: ReferenciaBOE[]
}
```

### `parseBOESumario()`

Al construir cada item, extraer del contexto del loop:
- `dept.titulo` → `departamento`
- `epigrafe.nombre ?? epigrafe.titulo` → `epigrafe` (el campo en el JSON puede tener nombre variable)
- `item.rango` → `rango`
- `item.identificador` ya es el `boe_id`

### `fetchBOEText()`

Cambiar firma de `Promise<string>` a `Promise<{ texto: string; referencias_boe: ReferenciaBOE[] }>`.

Antes del strip de tags, parsear el XML con `XMLParser` (ya importado) para extraer:

```
xml.data.documento.referencias.anteriores.anterior[]
  → { @_referencia (boe_id), @_orden (tipo), #text (descripcion) }
```

El strip de tags existente se mantiene igual para producir `texto`.

### `fetchBOE()`

Actualizar el batch map para desempaquetar `{ texto, referencias_boe }` de `fetchBOEText`.

---

## Cambios en prompts Claude

### `prompts/regtrack-clasificador.md`

Añadir al bloque de input del usuario (no al system prompt):

```
Departamento: {departamento}
Epígrafe oficial BOE: {epigrafe}
Rango oficial: {rango}
```

Estos campos se incluyen solo si están disponibles (items BOE). Para otras fuentes el input no cambia.

### `prompts/regtrack-impacto.md`

Añadir regla al system prompt:

> Si recibes el campo "Rango oficial", úsalo directamente como valor de `tipo_norma` sin inferirlo del texto.

---

## Cambios en `lib/claude.ts`

Las funciones `classifyDocument` y `analyzeImpact` reciben un parámetro opcional `meta?: { departamento?: string; epigrafe?: string; rango?: string }` que se antepone al `userContent` si está presente.

---

## Cambios en `actions/pipeline.ts`

### Paso 7 — Guardar alerta

Añadir al `alertaBase` para items BOE:

```typescript
boe_id: item.boe_id,
departamento: item.departamento,
epigrafe: item.epigrafe,
rango: item.rango ?? impact.tipo_norma,  // BOE tiene prioridad; fallback al inferido
referencias_boe: item.referencias_boe ?? [],
```

### Paso 8.0 — Correlación ground-truth (nuevo, antes de detectarRelaciones)

Solo para alertas BOE con `referencias_boe` no vacío:

```
Para cada ref en referencias_boe donde tipo IN ['modifica', 'deroga']:
  1. SELECT id FROM alertas WHERE boe_id = ref.boe_id LIMIT 1
  2. Si existe match:
     INSERT INTO alerta_relaciones
       (alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon)
     VALUES
       (saved.id, match.id, ref.tipo, 100, 'Referencia directa BOE: ' + ref.descripcion)
     ON CONFLICT (alerta_id, alerta_relacionada_id) DO NOTHING
```

`score_similitud: 100` — certeza absoluta (fuente: el propio BOE).
No bloquea el pipeline si falla (mismo patrón try/catch que correlación Claude).

### Paso 8 — Correlación Claude (sin cambios)

`detectarRelaciones()` sigue ejecutándose para capturar relaciones por subtema/territorio que no aparecen en las referencias formales del BOE.

---

## Archivos afectados

| Archivo | Tipo de cambio |
|---------|----------------|
| `supabase/migrations/008_boe_enrichment.sql` | Nuevo |
| `lib/sources/boe.ts` | Modificado (parser + tipos) |
| `lib/supabase.ts` | Modificado (tipo `Alerta` — nuevas columnas) |
| `lib/claude.ts` | Modificado (parámetro meta opcional) |
| `prompts/regtrack-clasificador.md` | Modificado (cabecera meta en input) |
| `prompts/regtrack-impacto.md` | Modificado (regla rango → tipo_norma) |
| `actions/pipeline.ts` | Modificado (nuevos campos + paso 8.0) |

Componentes UI (`CardNormativaRelacionada`, `TimelineNormativa`) no requieren cambios — ya muestran `tipo_relacion` y `razon` que vendrán rellenos correctamente.

---

## Lo que NO cambia

- El resto de fuentes (BOCM, DOGC, CCAA) — `NormalizedItem` es compatible hacia atrás con campos opcionales.
- `alerta_relaciones` — sin cambios de schema; las relaciones ground-truth usan los mismos tipos existentes (`modifica`, `deroga`).
- La lógica de correlación Claude — sigue igual, complementaria.
- El threshold de score (4) y el resto del pipeline.

---

## Consideraciones de robustez

- Si `<referencias>` no existe en el XML (normas sin referencias) → `referencias_boe: []`, sin error.
- Si `departamento` o `epigrafe` no están en el sumario → campos `undefined`, no se insertan en Supabase.
- Si la query ground-truth no encuentra match → no se crea relación, sin efecto en el pipeline.
- El índice `boe_id` permite que la query de lookup sea eficiente incluso con miles de alertas.
