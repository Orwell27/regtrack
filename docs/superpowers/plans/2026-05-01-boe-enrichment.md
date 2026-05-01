# BOE Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enriquecer los items del BOE con metadatos estructurales del sumario JSON (departamento, epígrafe, rango) y referencias normativas del XML, añadiendo correlación ground-truth entre normas relacionadas sin depender de inferencia IA.

**Architecture:** Se extiende `NormalizedItem` con cinco campos opcionales solo para BOE. `parseBOESumario` los extrae del sumario JSON sin coste extra. `fetchBOEText` pasa a devolver también `referencias_boe[]` parseando el nodo `<referencias>` del XML. En el pipeline, tras guardar la alerta, un nuevo paso 8.0 busca en Supabase alertas que coincidan con los `boe_id` referenciados y crea `alerta_relaciones` de tipo `modifica`/`deroga` con `score_similitud: 100`.

**Tech Stack:** TypeScript, fast-xml-parser (ya instalado), Supabase (PostgreSQL), vitest

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `supabase/migrations/008_boe_enrichment.sql` | Crear | Nuevas columnas en `alertas` + índice |
| `lib/sources/boe.ts` | Modificar | `ReferenciaBOE` tipo, `NormalizedItem` campos, `parseBOESumario`, `fetchBOEText`, `fetchBOE` |
| `lib/supabase.ts` | Modificar | Tipo `Alerta` — nuevas columnas opcionales |
| `lib/claude.ts` | Modificar | Param `meta` opcional en `classifyDocument` y `analyzeImpact` |
| `prompts/regtrack-clasificador.md` | Modificar | Instrucción de uso de metadatos BOE |
| `prompts/regtrack-impacto.md` | Modificar | Regla rango → tipo_norma |
| `actions/pipeline.ts` | Modificar | Nuevos campos en `alertaBase` + paso 8.0 ground-truth |
| `tests/fixtures/boe-sumario.json` | Modificar | Añadir `rango` al item del fixture |
| `tests/sources/boe.test.ts` | Modificar | Tests para nuevos campos de `parseBOESumario` |
| `tests/sources/boe-referencias.test.ts` | Crear | Tests para `parseReferencesBOE` |

---

## Task 1: Migración SQL 008

**Files:**
- Create: `supabase/migrations/008_boe_enrichment.sql`

- [ ] **Step 1: Crear el archivo de migración**

Contenido exacto:

```sql
-- supabase/migrations/008_boe_enrichment.sql

ALTER TABLE alertas
  ADD COLUMN boe_id          TEXT UNIQUE,
  ADD COLUMN departamento    TEXT,
  ADD COLUMN epigrafe        TEXT,
  ADD COLUMN rango           TEXT,
  ADD COLUMN referencias_boe JSONB DEFAULT '[]';

CREATE INDEX idx_alertas_boe_id ON alertas(boe_id);
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Ir al dashboard de Supabase → SQL Editor → pegar y ejecutar el contenido del archivo.

Verificar que no haya errores. Las columnas nuevas son opcionales (sin NOT NULL) así que las alertas existentes quedan con NULL/`[]` sin problema.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_boe_enrichment.sql
git commit -m "feat: migration 008 — boe enrichment columns"
```

---

## Task 2: Tipos TypeScript — `ReferenciaBOE`, `NormalizedItem`, `Alerta`

**Files:**
- Modify: `lib/sources/boe.ts`
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Añadir `ReferenciaBOE` y actualizar `NormalizedItem` en `lib/sources/boe.ts`**

Reemplazar la interfaz `NormalizedItem` existente:

```typescript
export interface ReferenciaBOE {
  boe_id: string
  tipo: 'modifica' | 'deroga' | 'complementa' | 'otro'
  descripcion: string
}

export interface NormalizedItem {
  id: string
  titulo: string
  url: string
  fuente: 'BOE' | 'BOCM' | 'DOGC' | 'BORM' | 'BOJA' | 'BOIB' | 'BOC_CANARIAS' | 'BOC_CANTABRIA' | 'BOCYL' | 'DOE' | 'DOG' | 'BOPV' | 'BOPA' | 'BON' | 'BOR'
  texto?: string
  _xmlUrl?: string
  // Solo BOE:
  boe_id?: string
  departamento?: string
  epigrafe?: string
  rango?: string
  referencias_boe?: ReferenciaBOE[]
}
```

- [ ] **Step 2: Actualizar el tipo `Alerta` en `lib/supabase.ts`**

Añadir las nuevas columnas al final del interface `Alerta` (antes del cierre `}`):

```typescript
  boe_id: string | null
  departamento: string | null
  epigrafe: string | null
  rango: string | null
  referencias_boe: ReferenciaBOE[]
```

También añadir el import al inicio del archivo:

```typescript
import type { ReferenciaBOE } from './sources/boe'
```

- [ ] **Step 3: Verificar que el proyecto compila sin errores**

```bash
npx tsc --noEmit
```

Expected: sin errores. Si aparece algún error de tipo, leerlo y corregir el campo afectado.

- [ ] **Step 4: Commit**

```bash
git add lib/sources/boe.ts lib/supabase.ts
git commit -m "feat: add ReferenciaBOE type and NormalizedItem/Alerta new fields"
```

---

## Task 3: `parseBOESumario` — extraer departamento, epígrafe, rango

**Files:**
- Modify: `tests/fixtures/boe-sumario.json`
- Modify: `tests/sources/boe.test.ts`
- Modify: `lib/sources/boe.ts`

- [ ] **Step 1: Actualizar el fixture con los nuevos campos**

Reemplazar el item en `tests/fixtures/boe-sumario.json` para incluir `rango`:

```json
{
  "data": {
    "sumario": {
      "diario": [{
        "seccion": [
          {
            "num": "1",
            "nombre": "I. Disposiciones generales",
            "departamento": [{
              "nombre": "MINISTERIO DE VIVIENDA",
              "epigrafe": [{
                "nombre": "Arrendamientos",
                "item": [{
                  "id": "BOE-A-2026-1234",
                  "identificador": "BOE-A-2026-1234",
                  "titulo": "Real Decreto 123/2026 sobre actualización de renta en contratos de arrendamiento",
                  "rango": "Real Decreto",
                  "url_html": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-1234",
                  "url_pdf": "https://www.boe.es/boe/dias/2026/04/11/pdfs/BOE-A-2026-1234.pdf"
                }]
              }]
            }]
          },
          {
            "num": "5",
            "nombre": "V. Anuncios",
            "departamento": [{
              "nombre": "OTROS",
              "epigrafe": [{
                "nombre": "Varios",
                "item": [{
                  "id": "BOE-A-2026-9999",
                  "titulo": "Anuncio sin interés inmobiliario",
                  "url_html": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-9999",
                  "url_pdf": ""
                }]
              }]
            }]
          }
        ]
      }]
    }
  }
}
```

- [ ] **Step 2: Escribir los tests que fallarán**

Añadir al describe `parseBOESumario` en `tests/sources/boe.test.ts`:

```typescript
it('extrae boe_id del campo identificador', () => {
  const items = parseBOESumario(fixture)
  expect(items[0].boe_id).toBe('BOE-A-2026-1234')
})

it('extrae departamento del sumario', () => {
  const items = parseBOESumario(fixture)
  expect(items[0].departamento).toBe('MINISTERIO DE VIVIENDA')
})

it('extrae epigrafe del sumario', () => {
  const items = parseBOESumario(fixture)
  expect(items[0].epigrafe).toBe('Arrendamientos')
})

it('extrae rango del item', () => {
  const items = parseBOESumario(fixture)
  expect(items[0].rango).toBe('Real Decreto')
})
```

- [ ] **Step 3: Ejecutar los tests para confirmar que fallan**

```bash
npx vitest run tests/sources/boe.test.ts
```

Expected: los 4 tests nuevos en FAIL con `undefined` en lugar del valor esperado.

- [ ] **Step 4: Actualizar `parseBOESumario` en `lib/sources/boe.ts`**

Reemplazar el bloque del push en `parseBOESumario`:

```typescript
for (const item of docItems) {
  const url = item.url_html?.texto ?? item.url_html
  const xmlUrl = item.url_xml?.texto ?? item.url_xml
  const id = item.identificador ?? item.id
  if (url && id) {
    items.push({
      id,
      titulo: item.titulo ?? '',
      url: typeof url === 'string' ? url : String(url),
      fuente: 'BOE',
      boe_id: id,
      departamento: dept.nombre ?? dept.titulo ?? undefined,
      epigrafe: typeof epigrafe === 'object' && !Array.isArray(epigrafe)
        ? (epigrafe.nombre ?? epigrafe.titulo ?? undefined)
        : undefined,
      rango: item.rango ?? undefined,
      _xmlUrl: xmlUrl ? (typeof xmlUrl === 'string' ? xmlUrl : String(xmlUrl)) : undefined,
    })
  }
}
```

- [ ] **Step 5: Ejecutar los tests para confirmar que pasan**

```bash
npx vitest run tests/sources/boe.test.ts
```

Expected: todos los tests en PASS (incluidos los preexistentes).

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/boe-sumario.json tests/sources/boe.test.ts lib/sources/boe.ts
git commit -m "feat: parseBOESumario extracts departamento, epigrafe, rango, boe_id"
```

---

## Task 4: `fetchBOEText` — parsear referencias del XML

**Files:**
- Create: `tests/sources/boe-referencias.test.ts`
- Modify: `lib/sources/boe.ts`

- [ ] **Step 1: Escribir los tests que fallarán**

Crear `tests/sources/boe-referencias.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseReferencesBOE } from '@/lib/sources/boe'

const xmlConReferencias = `<?xml version="1.0" encoding="UTF-8"?>
<documento>
  <metadatos><identificador>BOE-A-2024-99999</identificador></metadatos>
  <referencias>
    <anteriores>
      <anterior referencia="BOE-A-2013-11682" orden="MODIFICA">Modifica el artículo 18 del Real Decreto 235/2013</anterior>
    </anteriores>
  </referencias>
  <texto><p>Contenido de la norma</p></texto>
</documento>`

const xmlConMultiplesRefs = `<?xml version="1.0" encoding="UTF-8"?>
<documento>
  <referencias>
    <anteriores>
      <anterior referencia="BOE-A-2010-5555" orden="DEROGA">Deroga la Ley 4/2010</anterior>
      <anterior referencia="BOE-A-2015-8888" orden="MODIFICA">Modifica el artículo 3 de la Ley 5/2015</anterior>
    </anteriores>
  </referencias>
  <texto><p>Contenido</p></texto>
</documento>`

const xmlSinReferencias = `<?xml version="1.0" encoding="UTF-8"?>
<documento>
  <metadatos><identificador>BOE-A-2024-00001</identificador></metadatos>
  <texto><p>Contenido sin referencias</p></texto>
</documento>`

describe('parseReferencesBOE', () => {
  it('extrae una referencia de tipo modifica', () => {
    const refs = parseReferencesBOE(xmlConReferencias)
    expect(refs).toHaveLength(1)
    expect(refs[0].boe_id).toBe('BOE-A-2013-11682')
    expect(refs[0].tipo).toBe('modifica')
    expect(refs[0].descripcion).toContain('Real Decreto 235/2013')
  })

  it('extrae múltiples referencias', () => {
    const refs = parseReferencesBOE(xmlConMultiplesRefs)
    expect(refs).toHaveLength(2)
    expect(refs[0].tipo).toBe('deroga')
    expect(refs[1].tipo).toBe('modifica')
  })

  it('devuelve array vacío si no hay nodo referencias', () => {
    const refs = parseReferencesBOE(xmlSinReferencias)
    expect(refs).toEqual([])
  })

  it('devuelve array vacío con XML vacío o inválido', () => {
    expect(parseReferencesBOE('')).toEqual([])
    expect(parseReferencesBOE('not xml')).toEqual([])
  })
})
```

- [ ] **Step 2: Ejecutar los tests para confirmar que fallan**

```bash
npx vitest run tests/sources/boe-referencias.test.ts
```

Expected: FAIL con `parseReferencesBOE is not a function`.

- [ ] **Step 3: Implementar `parseReferencesBOE` en `lib/sources/boe.ts`**

Añadir la función después de los imports, antes de `RELEVANT_SECTIONS`:

```typescript
function mapOrden(orden: string): ReferenciaBOE['tipo'] {
  const o = (orden ?? '').toUpperCase()
  if (o.startsWith('MODIFICA')) return 'modifica'
  if (o.startsWith('DEROGA')) return 'deroga'
  if (o.startsWith('AÑADE') || o.startsWith('ANADE')) return 'complementa'
  return 'otro'
}

export function parseReferencesBOE(xml: string): ReferenciaBOE[] {
  if (!xml) return []
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const parsed = parser.parse(xml)
    const raw = parsed?.documento?.referencias?.anteriores?.anterior
    if (!raw) return []
    const items = Array.isArray(raw) ? raw : [raw]
    return items
      .filter((r: any) => r?.['@_referencia'])
      .map((r: any) => ({
        boe_id: String(r['@_referencia']),
        tipo: mapOrden(String(r['@_orden'] ?? '')),
        descripcion: String(r['#text'] ?? r['_text'] ?? '').trim(),
      }))
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Ejecutar los tests para confirmar que pasan**

```bash
npx vitest run tests/sources/boe-referencias.test.ts
```

Expected: todos en PASS.

- [ ] **Step 5: Actualizar `fetchBOEText` para devolver `{ texto, referencias_boe }`**

Reemplazar la función `fetchBOEText` completa:

```typescript
export async function fetchBOEText(
  id: string,
  xmlUrl?: string
): Promise<{ texto: string; referencias_boe: ReferenciaBOE[] }> {
  const targetUrl = xmlUrl ?? `https://www.boe.es/diario_boe/xml.php?id=${id}`
  try {
    const res = await fetch(targetUrl)
    if (!res.ok) return { texto: '', referencias_boe: [] }
    const xml = await res.text()
    const referencias_boe = parseReferencesBOE(xml)
    const sinTags = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const idxTitulo = sinTags.indexOf('Jefatura') !== -1
      ? sinTags.indexOf('Jefatura')
      : sinTags.indexOf('TEXTO')
    const texto = idxTitulo > 0 ? sinTags.slice(idxTitulo) : sinTags
    return { texto: texto.slice(0, 8000), referencias_boe }
  } catch {
    return { texto: '', referencias_boe: [] }
  }
}
```

- [ ] **Step 6: Actualizar `fetchBOE` para desempaquetar el nuevo retorno**

Reemplazar el bloque del batch map en `fetchBOE`:

```typescript
const withText = await Promise.all(
  batch.map(async (item) => {
    const { _xmlUrl, ...rest } = item
    const { texto, referencias_boe } = await fetchBOEText(item.id, _xmlUrl)
    return { ...rest, texto, referencias_boe }
  })
)
```

- [ ] **Step 7: Ejecutar todos los tests**

```bash
npx vitest run
```

Expected: todos en PASS. Si algún test existente falla por el cambio de firma de `fetchBOEText`, es porque no usa la función directamente — revisar si algún test mockea `fetchBOEText` y actualizar el mock para devolver el nuevo shape `{ texto, referencias_boe }`.

- [ ] **Step 8: Commit**

```bash
git add lib/sources/boe.ts tests/sources/boe-referencias.test.ts
git commit -m "feat: parseReferencesBOE extracts structured BOE cross-references"
```

---

## Task 5: Claude — parámetro meta + prompts

**Files:**
- Modify: `lib/claude.ts`
- Modify: `prompts/regtrack-clasificador.md`
- Modify: `prompts/regtrack-impacto.md`

- [ ] **Step 1: Añadir tipo `MetaBOE` y actualizar `classifyDocument` en `lib/claude.ts`**

Añadir el tipo después de los imports:

```typescript
export interface MetaBOE {
  departamento?: string
  epigrafe?: string
  rango?: string
}
```

Reemplazar la función `classifyDocument`:

```typescript
export async function classifyDocument(
  titulo: string,
  texto: string,
  meta?: MetaBOE
): Promise<ClassifyResult> {
  try {
    const systemPrompt = loadPrompt('regtrack-clasificador.md')
    const metaHeader = meta
      ? [
          meta.departamento ? `Departamento: ${meta.departamento}` : '',
          meta.epigrafe ? `Epígrafe oficial BOE: ${meta.epigrafe}` : '',
          meta.rango ? `Rango oficial: ${meta.rango}` : '',
        ].filter(Boolean).join('\n') + '\n\n'
      : ''
    const userContent = `${metaHeader}Título: ${titulo}\n\nTexto:\n${texto.slice(0, 3000)}`
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 384,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return JSON.parse(extractJson(text)) as ClassifyResult
  } catch (err) {
    console.error('classifyDocument error:', err)
    return { relevante: false, subtema: 'otro', ambito_territorial: 'estatal', motivo: 'Error de clasificación' }
  }
}
```

- [ ] **Step 2: Actualizar `analyzeImpact` en `lib/claude.ts`**

Reemplazar la función `analyzeImpact`:

```typescript
export async function analyzeImpact(
  titulo: string,
  texto: string,
  fuente: string,
  meta?: MetaBOE
): Promise<ImpactResult | null> {
  try {
    const systemPrompt = loadPrompt('regtrack-impacto.md')
    const metaHeader = meta
      ? [
          meta.departamento ? `Departamento: ${meta.departamento}` : '',
          meta.epigrafe ? `Epígrafe oficial BOE: ${meta.epigrafe}` : '',
          meta.rango ? `Rango oficial: ${meta.rango}` : '',
        ].filter(Boolean).join('\n') + '\n\n'
      : ''
    const userContent = `${metaHeader}Fuente: ${fuente}\nTítulo: ${titulo}\n\nTexto completo:\n${texto.slice(0, 8000)}`
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return JSON.parse(extractJson(text)) as ImpactResult
  } catch (err) {
    console.error('analyzeImpact error:', err)
    return null
  }
}
```

- [ ] **Step 3: Actualizar `prompts/regtrack-impacto.md`**

Añadir esta regla al bloque de REGLAS (después de la última regla existente, antes del JSON de respuesta):

```
- Si recibes el campo "Rango oficial" al inicio del mensaje, úsalo directamente como valor de tipo_norma sin inferirlo del texto.
```

- [ ] **Step 4: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores. Si hay errores en `actions/pipeline.ts` por la nueva firma de `analyzeImpact`, son esperados — se corrigen en Task 6.

- [ ] **Step 5: Commit**

```bash
git add lib/claude.ts prompts/regtrack-impacto.md
git commit -m "feat: add optional meta param to Claude functions for BOE metadata"
```

---

## Task 6: Pipeline — nuevos campos + correlación ground-truth

**Files:**
- Modify: `actions/pipeline.ts`

- [ ] **Step 1: Actualizar las llamadas a `classifyDocument` y `analyzeImpact`**

En el paso 4 del pipeline (clasificar con Claude Haiku), reemplazar:

```typescript
const classification = await classifyDocument(item.titulo, texto)
```

por:

```typescript
const meta = item.fuente === 'BOE' ? {
  departamento: item.departamento,
  epigrafe: item.epigrafe,
  rango: item.rango,
} : undefined
const classification = await classifyDocument(item.titulo, texto, meta)
```

En el paso 5 (analizar impacto), reemplazar:

```typescript
const impact = await analyzeImpact(item.titulo, texto, item.fuente)
```

por:

```typescript
const impact = await analyzeImpact(item.titulo, texto, item.fuente, meta)
```

- [ ] **Step 2: Añadir nuevos campos al `alertaBase`**

En el objeto `alertaBase` (paso 6), añadir después de `score_relevancia`:

```typescript
boe_id: item.boe_id ?? null,
departamento: item.departamento ?? null,
epigrafe: item.epigrafe ?? null,
rango: item.rango ?? impact.tipo_norma ?? null,
referencias_boe: item.referencias_boe ?? [],
```

- [ ] **Step 3: Añadir el paso 8.0 — correlación ground-truth**

Insertar el siguiente bloque después de `procesados++` y antes del bloque de correlación Claude (paso 8 existente):

```typescript
// 8.0 Correlación ground-truth (referencias directas del BOE)
if (item.fuente === 'BOE' && item.referencias_boe && item.referencias_boe.length > 0) {
  try {
    const refIds = item.referencias_boe
      .filter(r => r.tipo === 'modifica' || r.tipo === 'deroga')
      .map(r => r.boe_id)

    if (refIds.length > 0) {
      const { data: matches } = await db
        .from('alertas')
        .select('id, boe_id')
        .in('boe_id', refIds)

      for (const match of matches ?? []) {
        const ref = item.referencias_boe.find(r => r.boe_id === match.boe_id)
        if (!ref) continue
        const { error: relErr } = await db
          .from('alerta_relaciones')
          .upsert({
            alerta_id: saved.id,
            alerta_relacionada_id: match.id,
            tipo_relacion: ref.tipo as 'modifica' | 'deroga',
            score_similitud: 100,
            razon: `Referencia directa BOE: ${ref.descripcion}`,
          }, { onConflict: 'alerta_id,alerta_relacionada_id' })
        if (relErr) {
          console.error('[pipeline] Error en correlación ground-truth:', relErr.message)
        } else {
          console.log(`[pipeline] Relación ground-truth (${ref.tipo}): ${saved.id} → ${match.id}`)
        }
      }
    }
  } catch (gtErr) {
    console.error('[pipeline] Error en correlación ground-truth (no bloqueante):', gtErr)
  }
}
```

- [ ] **Step 4: Verificar que compila**

```bash
npx tsc --noEmit
```

Expected: sin errores de tipo.

- [ ] **Step 5: Ejecutar todos los tests**

```bash
npx vitest run
```

Expected: todos en PASS.

- [ ] **Step 6: Commit**

```bash
git add actions/pipeline.ts
git commit -m "feat: pipeline uses BOE metadata + ground-truth correlation from XML references"
```

---

## Task 7: Verificación end-to-end

**Files:** ninguno nuevo

- [ ] **Step 1: Ejecutar el pipeline en modo dry-run**

```bash
npm run pipeline
```

Observar en los logs:
- `[pipeline] Total items: N (BOE:X ...)`
- Para items BOE relevantes, confirmar que el log no muestra errores de tipo o de inserción a Supabase.
- Si algún item tiene referencias BOE, debería aparecer `[pipeline] Relación ground-truth (modifica|deroga): ...`

- [ ] **Step 2: Verificar en Supabase que las nuevas columnas se rellenan**

En el SQL Editor de Supabase:

```sql
SELECT boe_id, departamento, epigrafe, rango, referencias_boe
FROM alertas
WHERE fuente = 'BOE' AND boe_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

Expected: al menos una fila con `departamento` y `epigrafe` no nulos para las alertas procesadas hoy.

- [ ] **Step 3: Verificar relaciones ground-truth si existen**

```sql
SELECT ar.tipo_relacion, ar.score_similitud, ar.razon,
       a1.titulo AS norma_nueva, a2.titulo AS norma_referenciada
FROM alerta_relaciones ar
JOIN alertas a1 ON a1.id = ar.alerta_id
JOIN alertas a2 ON a2.id = ar.alerta_relacionada_id
WHERE ar.score_similitud = 100
ORDER BY ar.detectada_en DESC
LIMIT 10;
```

Expected: si el BOE publicó hoy alguna norma que modifica/deroga una ya indexada, aparecerá aquí con `score_similitud = 100` y la razón textual del BOE.

- [ ] **Step 4: Commit final de verificación (si todo ok)**

```bash
git add .
git commit -m "chore: BOE enrichment verified end-to-end"
```

---

## Notas de implementación

**Estructura XML del BOE:** El nodo `<referencias><anteriores><anterior>` existe en normas que modifican o derogan otras. Normas completamente nuevas no tendrán este nodo — `parseReferencesBOE` devuelve `[]` en ese caso sin error.

**El campo `rango` en el sumario JSON:** El BOE API incluye `rango` en los items del sumario (ej: `"rango": "Real Decreto"`). El fixture de tests se ha actualizado para incluirlo. Si en producción algún item no lo trae, `item.rango` será `undefined` y el campo `rango` en Supabase quedará como el valor que Claude infiera de `tipo_norma`.

**Correlación Claude sigue activa:** El paso 8.0 ground-truth solo detecta relaciones donde el BOE referencia explícitamente otra norma ya indexada. El paso 8 (Claude) detecta relaciones conceptuales por subtema/territorio — complementarios, no redundantes.
