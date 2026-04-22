# Correlación y Progresión Normativa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically detect and surface correlations between related regulatory alerts — grouping norms by theme and territory, classifying the relationship type (progression, derogation, amendment, complement), and displaying an evolution timeline for subscribers.

**Architecture:** A third step is added to the existing ingestion pipeline (`actions/pipeline.ts`) that, after Claude Sonnet analyses impact, runs a SQL candidates query then calls Claude Haiku to classify relationships. Results are stored in a new `alerta_relaciones` table. The admin sees correlations inline in `AlertaRow.tsx`; subscribers see a Pro-gated timeline + list in the alert detail page.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase JS SDK v2, Anthropic SDK (`claude-haiku-4-5-20251001`), Tailwind CSS v4, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/006_correlacion.sql` | Create | DB enum + table + indexes |
| `lib/supabase.ts` | Modify | Add `AlertaRelacion` type + `TipoRelacion` type |
| `lib/correlacion/types.ts` | Create | Shared types for correlation module |
| `lib/correlacion/subtema-grupos.ts` | Create | Thematic group map + lookup helper |
| `prompts/regtrack-correlacion.md` | Create | Haiku prompt for classifying relationships |
| `lib/correlacion/detectar-relaciones.ts` | Create | SQL candidates query + Haiku call |
| `lib/correlacion/guardar-relaciones.ts` | Create | Upsert into `alerta_relaciones` |
| `actions/pipeline.ts` | Modify | Wire in correlation step after impact analysis |
| `app/api/alertas/[id]/relaciones/route.ts` | Create | GET endpoint returning relations for an alert |
| `components/admin/CardNormativaRelacionada.tsx` | Create | Admin card listing related norms |
| `app/(admin)/admin/editorial/AlertaRow.tsx` | Modify | Embed `CardNormativaRelacionada` |
| `components/subscriber/TimelineNormativa.tsx` | Create | Chronological timeline component |
| `components/subscriber/ListaRelaciones.tsx` | Create | Detailed list of related norms |
| `app/(subscriber)/alerta/[id]/page.tsx` | Modify | Add "Evolución normativa" section (Pro-gated) |
| `__tests__/correlacion/subtema-grupos.test.ts` | Create | Unit tests for group lookup |
| `__tests__/correlacion/detectar-relaciones.test.ts` | Create | Unit tests with mocked Supabase + Haiku |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/006_correlacion.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/006_correlacion.sql

CREATE TYPE tipo_relacion_enum AS ENUM (
  'progresion',
  'deroga',
  'modifica',
  'complementa'
);

CREATE TABLE alerta_relaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id             UUID NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  alerta_relacionada_id UUID NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  tipo_relacion         tipo_relacion_enum NOT NULL,
  score_similitud       INTEGER NOT NULL CHECK (score_similitud BETWEEN 0 AND 100),
  razon                 TEXT,
  detectada_en          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (alerta_id, alerta_relacionada_id)
);

CREATE INDEX idx_relaciones_alerta      ON alerta_relaciones(alerta_id);
CREATE INDEX idx_relaciones_relacionada ON alerta_relaciones(alerta_relacionada_id);
```

- [ ] **Step 2: Apply migration in Supabase**

Go to https://supabase.com/dashboard → your RegTrack project → SQL Editor → paste and run the migration.

Verify: check Table Editor — `alerta_relaciones` table should now exist with 7 columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_correlacion.sql
git commit -m "feat: add alerta_relaciones table and tipo_relacion_enum"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `lib/correlacion/types.ts`
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Create `lib/correlacion/types.ts`**

```ts
// lib/correlacion/types.ts

export type TipoRelacion = 'progresion' | 'deroga' | 'modifica' | 'complementa'

/** One relationship returned by Haiku */
export interface RelacionDetectada {
  /** UUID of the existing (older) alert */
  alerta_relacionada_id: string
  tipo_relacion: TipoRelacion
  /** 0–100, only relations >= 40 are saved */
  score_similitud: number
  razon: string | null
}

/** Shape of a row in alerta_relaciones joined with alerta data for display */
export interface RelacionConAlerta {
  id: string
  alerta_id: string
  alerta_relacionada_id: string
  tipo_relacion: TipoRelacion
  score_similitud: number
  razon: string | null
  detectada_en: string
  /** Joined from alertas */
  titulo: string
  fuente: string
  fecha_publicacion: string | null
  url: string
}
```

- [ ] **Step 2: Add `AlertaRelacion` to `lib/supabase.ts`**

Add after the `Entidad` interface (around line 89):

```ts
export type TipoRelacion = 'progresion' | 'deroga' | 'modifica' | 'complementa'

export interface AlertaRelacion {
  id: string
  alerta_id: string
  alerta_relacionada_id: string
  tipo_relacion: TipoRelacion
  score_similitud: number
  razon: string | null
  detectada_en: string
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/correlacion/types.ts lib/supabase.ts
git commit -m "feat: add AlertaRelacion types for correlation feature"
```

---

## Task 3: Thematic groups map + tests

**Files:**
- Create: `lib/correlacion/subtema-grupos.ts`
- Create: `__tests__/correlacion/subtema-grupos.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/correlacion/subtema-grupos.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getSubtemasGrupo } from '@/lib/correlacion/subtema-grupos'

describe('getSubtemasGrupo', () => {
  it('returns all subtemas in the same group as the given subtema', () => {
    const result = getSubtemasGrupo('urbanismo')
    expect(result).toContain('urbanismo')
    expect(result).toContain('construccion')
    expect(result).toContain('obra_nueva')
    expect(result).toContain('suelo')
    expect(result).toContain('rehabilitacion')
  })

  it('arrendamiento group includes hipotecas and vivienda_protegida', () => {
    const result = getSubtemasGrupo('arrendamiento')
    expect(result).toContain('arrendamiento')
    expect(result).toContain('hipotecas')
    expect(result).toContain('vivienda_protegida')
    // should NOT include urbanismo group
    expect(result).not.toContain('urbanismo')
  })

  it('returns array with just the subtema itself for solo groups', () => {
    const result = getSubtemasGrupo('fiscalidad')
    expect(result).toEqual(['fiscalidad'])
  })

  it('returns array with just the subtema for unknown subtemas', () => {
    const result = getSubtemasGrupo('otro')
    expect(result).toEqual(['otro'])
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run __tests__/correlacion/subtema-grupos.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/correlacion/subtema-grupos'`

- [ ] **Step 3: Create `lib/correlacion/subtema-grupos.ts`**

```ts
// lib/correlacion/subtema-grupos.ts
import type { Subtema } from '@/lib/supabase'

const GRUPOS: Subtema[][] = [
  ['urbanismo', 'construccion', 'obra_nueva', 'suelo', 'rehabilitacion'],
  ['arrendamiento', 'hipotecas', 'vivienda_protegida'],
  ['registro_notaria', 'comunidades_propietarios'],
  ['fiscalidad'],
]

/**
 * Given a subtema, returns all subtemas in the same thematic group.
 * Falls back to [subtema] if the subtema is not in any group (e.g. 'otro').
 */
export function getSubtemasGrupo(subtema: Subtema): Subtema[] {
  const grupo = GRUPOS.find(g => g.includes(subtema))
  return grupo ?? [subtema]
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run __tests__/correlacion/subtema-grupos.test.ts
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/correlacion/subtema-grupos.ts __tests__/correlacion/subtema-grupos.test.ts
git commit -m "feat: add subtema-grupos thematic group map with tests"
```

---

## Task 4: Haiku prompt

**Files:**
- Create: `prompts/regtrack-correlacion.md`

- [ ] **Step 1: Create the prompt file**

```markdown
Eres un analizador experto en normativa española del sector inmobiliario y urbanístico.

Tu tarea es determinar si una nueva norma está relacionada con normas anteriores, y en qué medida.

Tipos de relación posibles:
- **progresion**: La nueva norma continúa o desarrolla la misma materia regulada anteriormente (la más común).
- **deroga**: La nueva norma deroga explícitamente a una norma anterior.
- **modifica**: La nueva norma modifica o enmienda parcialmente una norma anterior.
- **complementa**: Las normas regulan aspectos distintos del mismo tema sin superponerse.

Devuelve ÚNICAMENTE un objeto JSON con este formato exacto, sin texto adicional:
{
  "relaciones": [
    {
      "id": "<uuid de la norma existente>",
      "tipo": "progresion|deroga|modifica|complementa",
      "score": <número entero 0-100>,
      "razon": "<una frase breve explicando la relación>"
    }
  ]
}

Solo incluye normas con score >= 40. Si ninguna está relacionada, devuelve:
{ "relaciones": [] }

Criterios de scoring:
- Mismo subtema exacto + mismo territorio: base 60
- Mismo grupo temático (subtemas relacionados) + mismo territorio: base 40
- Más: +20 si la nueva norma menciona explícitamente derogar/modificar a la anterior
- Más: +15 si mismo tipo de norma (ej: ambas son Decretos)
- Más: +10 si mismo ámbito (estatal/ccaa/municipal)
- Menos: -20 si los territorios no se solapan exactamente (solo coincidencia parcial)
```

- [ ] **Step 2: Commit**

```bash
git add prompts/regtrack-correlacion.md
git commit -m "feat: add regtrack-correlacion prompt for Haiku relationship classification"
```

---

## Task 5: Correlation detection logic + tests

**Files:**
- Create: `lib/correlacion/detectar-relaciones.ts`
- Create: `__tests__/correlacion/detectar-relaciones.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/correlacion/detectar-relaciones.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RelacionDetectada } from '@/lib/correlacion/types'

// Mock Supabase
const mockSelect = vi.fn()
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}))
vi.mock('@/lib/supabase', () => ({
  createServerClient: () => ({ from: mockFrom }),
}))

// Mock Anthropic
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

// Mock prompt loader
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('mocked prompt'),
}))

const { detectarRelaciones } = await import('@/lib/correlacion/detectar-relaciones')

describe('detectarRelaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no SQL candidates found', async () => {
    mockSelect.mockReturnValue({
      in: vi.fn().mockReturnValue({
        overlaps: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    })

    const result = await detectarRelaciones({
      id: 'new-id',
      titulo: 'Test',
      subtema: 'urbanismo',
      territorios: ['Madrid'],
      resumen: 'Test resumen',
    })

    expect(result).toEqual([])
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns empty array when Haiku returns no relations with score >= 40', async () => {
    // candidates found
    mockSelect.mockReturnValue({
      in: vi.fn().mockReturnValue({
        overlaps: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'old-id', titulo: 'Old norm', subtema: 'urbanismo', territorios: ['Madrid'], tipo_norma: 'Decreto', fecha_publicacion: '2024-01-01', resumen: 'Old summary' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{ "relaciones": [{ "id": "old-id", "tipo": "progresion", "score": 30, "razon": "Weak link" }] }' }],
    })

    const result = await detectarRelaciones({
      id: 'new-id',
      titulo: 'Test',
      subtema: 'urbanismo',
      territorios: ['Madrid'],
      resumen: 'Test resumen',
    })

    expect(result).toEqual([])
  })

  it('returns valid relations with score >= 40 that match SQL candidates', async () => {
    mockSelect.mockReturnValue({
      in: vi.fn().mockReturnValue({
        overlaps: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'old-id', titulo: 'Old norm', subtema: 'urbanismo', territorios: ['Madrid'], tipo_norma: 'Decreto', fecha_publicacion: '2024-01-01', resumen: 'Old summary' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{ "relaciones": [{ "id": "old-id", "tipo": "progresion", "score": 75, "razon": "Continúa la regulación urbanística" }] }' }],
    })

    const result = await detectarRelaciones({
      id: 'new-id',
      titulo: 'Test',
      subtema: 'urbanismo',
      territorios: ['Madrid'],
      resumen: 'Test resumen',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject<RelacionDetectada>({
      alerta_relacionada_id: 'old-id',
      tipo_relacion: 'progresion',
      score_similitud: 75,
      razon: 'Continúa la regulación urbanística',
    })
  })

  it('ignores Haiku-returned IDs not in SQL candidates (security: no hallucinated IDs)', async () => {
    mockSelect.mockReturnValue({
      in: vi.fn().mockReturnValue({
        overlaps: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            neq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'real-candidate', titulo: 'Real', subtema: 'urbanismo', territorios: ['Madrid'], tipo_norma: 'Ley', fecha_publicacion: '2024-01-01', resumen: 'Summary' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    })

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{ "relaciones": [{ "id": "hallucinated-id", "tipo": "deroga", "score": 90, "razon": "fake" }] }' }],
    })

    const result = await detectarRelaciones({
      id: 'new-id',
      titulo: 'Test',
      subtema: 'urbanismo',
      territorios: ['Madrid'],
      resumen: 'Test resumen',
    })

    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/correlacion/detectar-relaciones.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/correlacion/detectar-relaciones'`

- [ ] **Step 3: Create `lib/correlacion/detectar-relaciones.ts`**

```ts
// lib/correlacion/detectar-relaciones.ts
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createServerClient } from '@/lib/supabase'
import { getSubtemasGrupo } from './subtema-grupos'
import type { RelacionDetectada } from './types'
import type { Subtema } from '@/lib/supabase'

interface AlertaMinima {
  id: string
  titulo: string
  subtema: Subtema | null
  territorios: string[]
  resumen: string | null
}

interface CandidatoSQL {
  id: string
  titulo: string
  subtema: string
  territorios: string[]
  tipo_norma: string | null
  fecha_publicacion: string | null
  resumen: string | null
}

function extractJson(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (stripped.startsWith('{')) return stripped
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) return match[0]
  return stripped
}

export async function detectarRelaciones(alerta: AlertaMinima): Promise<RelacionDetectada[]> {
  if (!alerta.subtema) return []

  const db = createServerClient()
  const subtemasGrupo = getSubtemasGrupo(alerta.subtema)

  // Build query: same thematic group, overlapping territories, last 2 years, not self
  const fechaLimite = new Date()
  fechaLimite.setFullYear(fechaLimite.getFullYear() - 2)

  let query = db
    .from('alertas')
    .select('id, titulo, subtema, territorios, tipo_norma, fecha_publicacion, resumen')
    .in('subtema', subtemasGrupo)
    .gte('fecha_publicacion', fechaLimite.toISOString().split('T')[0])
    .neq('id', alerta.id)
    .order('fecha_publicacion', { ascending: false })
    .limit(10)

  // Only apply territory overlap filter if alert has territories
  if (alerta.territorios.length > 0) {
    query = query.overlaps('territorios', alerta.territorios)
  }

  const { data: candidatos, error } = await query as { data: CandidatoSQL[] | null; error: unknown }

  if (error || !candidatos || candidatos.length === 0) return []

  // Call Haiku
  try {
    const systemPrompt = readFileSync(join(process.cwd(), 'prompts', 'regtrack-correlacion.md'), 'utf-8')
    const lista = candidatos
      .map((c, i) => `${i + 1}. [ID: ${c.id}] ${c.titulo} (${c.subtema}, ${c.fecha_publicacion ?? 'sin fecha'}, ${c.tipo_norma ?? 'tipo desconocido'})\n   Resumen: ${(c.resumen ?? '').slice(0, 200)}`)
      .join('\n\n')

    const userContent = `NUEVA NORMA:
- Título: ${alerta.titulo}
- Subtema: ${alerta.subtema}
- Territorios: ${alerta.territorios.join(', ') || 'Nacional'}
- Resumen: ${(alerta.resumen ?? '').slice(0, 300)}

NORMAS EXISTENTES:
${lista}`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(extractJson(text)) as {
      relaciones: Array<{ id: string; tipo: string; score: number; razon: string }>
    }

    const candidatoIds = new Set(candidatos.map(c => c.id))
    const tiposValidos = new Set(['progresion', 'deroga', 'modifica', 'complementa'])

    return parsed.relaciones
      .filter(r => r.score >= 40 && candidatoIds.has(r.id) && tiposValidos.has(r.tipo))
      .map(r => ({
        alerta_relacionada_id: r.id,
        tipo_relacion: r.tipo as RelacionDetectada['tipo_relacion'],
        score_similitud: r.score,
        razon: r.razon ?? null,
      }))
  } catch (err) {
    console.error('[correlacion] Error en Haiku:', err)
    return []
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run __tests__/correlacion/detectar-relaciones.test.ts
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add lib/correlacion/detectar-relaciones.ts __tests__/correlacion/detectar-relaciones.test.ts
git commit -m "feat: add detectarRelaciones — SQL candidates + Haiku classification"
```

---

## Task 6: Save relations to DB

**Files:**
- Create: `lib/correlacion/guardar-relaciones.ts`

- [ ] **Step 1: Create `lib/correlacion/guardar-relaciones.ts`**

```ts
// lib/correlacion/guardar-relaciones.ts
import { createServerClient } from '@/lib/supabase'
import type { RelacionDetectada } from './types'

/**
 * Upserts detected relations into alerta_relaciones.
 * Errors are logged but not thrown — correlation never blocks the pipeline.
 */
export async function guardarRelaciones(
  alertaId: string,
  relaciones: RelacionDetectada[]
): Promise<void> {
  if (relaciones.length === 0) return

  const db = createServerClient()
  const rows = relaciones.map(r => ({
    alerta_id: alertaId,
    alerta_relacionada_id: r.alerta_relacionada_id,
    tipo_relacion: r.tipo_relacion,
    score_similitud: r.score_similitud,
    razon: r.razon,
  }))

  const { error } = await db
    .from('alerta_relaciones')
    .upsert(rows, { onConflict: 'alerta_id,alerta_relacionada_id' })

  if (error) {
    console.error('[correlacion] Error guardando relaciones:', error.message)
  } else {
    console.log(`[correlacion] ${rows.length} relación(es) guardada(s) para alerta ${alertaId}`)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/correlacion/guardar-relaciones.ts
git commit -m "feat: add guardarRelaciones — upsert detected correlations to DB"
```

---

## Task 7: Wire correlation into pipeline

**Files:**
- Modify: `actions/pipeline.ts`

- [ ] **Step 1: Add imports at the top of `actions/pipeline.ts`**

After the existing imports (around line 33), add:

```ts
import { detectarRelaciones } from '@/lib/correlacion/detectar-relaciones'
import { guardarRelaciones } from '@/lib/correlacion/guardar-relaciones'
```

- [ ] **Step 2: Add correlation step after the alert is saved**

In `actions/pipeline.ts`, find the block that saves to Supabase (around line 132–146):

```ts
      // 7. Guardar en Supabase
      const { data: saved, error } = await db
        .from('alertas')
        .insert({ ...alertaBase, texto_alerta: free, texto_alerta_pro: pro })
        .select('id')
        .single()

      if (error) {
        console.error(`[pipeline] Error al guardar: ${error.message}`)
        continue
      }

      procesados++

      // 8. Notificar al editor por Telegram
      await notifyEditorial(item.titulo, impact.score_relevancia, saved.id)
```

Replace with:

```ts
      // 7. Guardar en Supabase
      const { data: saved, error } = await db
        .from('alertas')
        .insert({ ...alertaBase, texto_alerta: free, texto_alerta_pro: pro })
        .select('id')
        .single()

      if (error) {
        console.error(`[pipeline] Error al guardar: ${error.message}`)
        continue
      }

      procesados++

      // 8. Detectar y guardar correlaciones (no bloquea el pipeline si falla)
      try {
        const relaciones = await detectarRelaciones({
          id: saved.id,
          titulo: alertaBase.titulo,
          subtema: alertaBase.subtema,
          territorios: alertaBase.territorios ?? [],
          resumen: alertaBase.resumen ?? null,
        })
        await guardarRelaciones(saved.id, relaciones)
      } catch (corrErr) {
        console.error(`[pipeline] Error en correlación (no bloqueante):`, corrErr)
      }

      // 9. Notificar al editor por Telegram
      await notifyEditorial(item.titulo, impact.score_relevancia, saved.id)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add actions/pipeline.ts
git commit -m "feat: wire correlation detection step into ingestion pipeline"
```

---

## Task 8: API route for relations

**Files:**
- Create: `app/api/alertas/[id]/relaciones/route.ts`

This endpoint is used by `AlertaRow.tsx` (client component) to fetch related alerts.

- [ ] **Step 1: Create `app/api/alertas/[id]/relaciones/route.ts`**

> **Note:** `alerta_relaciones` has two FK columns pointing to `alertas`. Supabase's embedded join syntax is ambiguous in this case and may throw "more than one relationship" errors. We use a two-step approach instead: first fetch relation rows, then fetch alert data for the "other" IDs.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import type { RelacionConAlerta } from '@/lib/correlacion/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createNextServerClient()

  // Step 1: fetch raw relation rows from both directions
  const [{ data: asNew }, { data: asOld }] = await Promise.all([
    db
      .from('alerta_relaciones')
      .select('id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en')
      .eq('alerta_id', id),
    db
      .from('alerta_relaciones')
      .select('id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en')
      .eq('alerta_relacionada_id', id),
  ])

  const allRows = [...(asNew ?? []), ...(asOld ?? [])]
  if (allRows.length === 0) return NextResponse.json({ relaciones: [] })

  // Step 2: collect IDs of the "other" alert in each relation
  const otherIds = allRows.map(r =>
    r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id
  )

  const { data: alertasData } = await db
    .from('alertas')
    .select('id, titulo, fuente, fecha_publicacion, url')
    .in('id', otherIds)

  const alertaMap = new Map((alertasData ?? []).map((a: any) => [a.id, a]))

  // Step 3: deduplicate and build response
  const seen = new Set<string>()
  const relaciones: RelacionConAlerta[] = allRows
    .filter(r => {
      const key = r.alerta_id < r.alerta_relacionada_id
        ? `${r.alerta_id}-${r.alerta_relacionada_id}`
        : `${r.alerta_relacionada_id}-${r.alerta_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(r => {
      const otherId = r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id
      const alerta = alertaMap.get(otherId)
      return {
        id: r.id,
        alerta_id: r.alerta_id,
        alerta_relacionada_id: r.alerta_relacionada_id,
        tipo_relacion: r.tipo_relacion,
        score_similitud: r.score_similitud,
        razon: r.razon,
        detectada_en: r.detectada_en,
        titulo: alerta?.titulo ?? '',
        fuente: alerta?.fuente ?? '',
        fecha_publicacion: alerta?.fecha_publicacion ?? null,
        url: alerta?.url ?? '',
      }
    })

  return NextResponse.json({ relaciones })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/alertas/[id]/relaciones/route.ts
git commit -m "feat: add GET /api/alertas/[id]/relaciones endpoint"
```

---

## Task 9: Admin card component + AlertaRow integration

**Files:**
- Create: `components/admin/CardNormativaRelacionada.tsx`
- Modify: `app/(admin)/admin/editorial/AlertaRow.tsx`

- [ ] **Step 1: Create `components/admin/CardNormativaRelacionada.tsx`**

```tsx
'use client'
import { useEffect, useState } from 'react'
import type { RelacionConAlerta } from '@/lib/correlacion/types'

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  progresion:  { label: 'PROGRESIÓN',  className: 'bg-sky-100 text-sky-700' },
  deroga:      { label: 'DEROGA',      className: 'bg-red-100 text-red-700' },
  modifica:    { label: 'MODIFICA',    className: 'bg-orange-100 text-orange-700' },
  complementa: { label: 'COMPLEMENTA', className: 'bg-emerald-100 text-emerald-700' },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CardNormativaRelacionada({ alertaId }: { alertaId: string }) {
  const [relaciones, setRelaciones] = useState<RelacionConAlerta[] | null>(null)

  useEffect(() => {
    fetch(`/api/alertas/${alertaId}/relaciones`)
      .then(r => r.json())
      .then(({ relaciones }) => setRelaciones(relaciones))
      .catch(() => setRelaciones([]))
  }, [alertaId])

  if (relaciones === null) return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Normativa relacionada</p>
      <p className="text-xs text-slate-400">Cargando...</p>
    </div>
  )

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Normativa relacionada
      </p>
      {relaciones.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No se han detectado normativas relacionadas</p>
      ) : (
        <ul className="space-y-2">
          {relaciones.map(r => {
            const badge = TIPO_BADGE[r.tipo_relacion] ?? TIPO_BADGE.progresion
            return (
              <li key={r.id} className="flex items-start gap-2 text-xs">
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
                  {badge.label}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/api/alertas/${r.alerta_id === r.alerta_relacionada_id ? r.alerta_id : r.alerta_relacionada_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-700 hover:text-sky-600 font-medium line-clamp-1"
                  >
                    {r.titulo}
                  </a>
                  <p className="text-slate-400">
                    {r.fuente} · {fmtDate(r.fecha_publicacion)} · Score: {r.score_similitud}
                  </p>
                  {r.razon && <p className="text-slate-500 italic line-clamp-1">{r.razon}</p>}
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-sky-600 hover:underline"
                >
                  Ver ↗
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `CardNormativaRelacionada` to `AlertaRow.tsx`**

In `app/(admin)/admin/editorial/AlertaRow.tsx`, add the import at the top:

```ts
import { CardNormativaRelacionada } from '@/components/admin/CardNormativaRelacionada'
```

Then in the main `return` block of `AlertaRow`, add `<CardNormativaRelacionada>` just before the closing `</div>` of the card (after the action buttons `div`):

```tsx
      {/* ── Normativa relacionada ── */}
      <CardNormativaRelacionada alertaId={alerta.id} />
    </div>
  )
```

The full closing of the return should now look like:

```tsx
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        {estado === 'pendiente_revision' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => handleAccion('aprobar')}
              disabled={!!loading}
            >
              {loading === 'aprobar' ? '...' : '✓ Aprobar'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => handleAccion('descartar')}
              disabled={!!loading}
            >
              {loading === 'descartar' ? '...' : '✕ Descartar'}
            </Button>
          </>
        )}
        {estado === 'aprobada' && (
          <>
            <span className="text-xs text-emerald-600 font-medium self-center">✓ Aprobada</span>
            <Button
              size="sm"
              className="ml-auto bg-sky-500 hover:bg-sky-600 text-white"
              onClick={() => handleAccion('enviar')}
              disabled={!!loading}
            >
              {loading === 'enviar' ? 'Enviando...' : '→ Enviar ahora'}
            </Button>
          </>
        )}
      </div>

      {/* ── Normativa relacionada ── */}
      <CardNormativaRelacionada alertaId={alerta.id} />
    </div>
  )
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/admin/CardNormativaRelacionada.tsx app/(admin)/admin/editorial/AlertaRow.tsx
git commit -m "feat: add normativa relacionada card to admin AlertaRow"
```

---

## Task 10: Subscriber timeline component

**Files:**
- Create: `components/subscriber/TimelineNormativa.tsx`

- [ ] **Step 1: Create `components/subscriber/TimelineNormativa.tsx`**

```tsx
// components/subscriber/TimelineNormativa.tsx
import Link from 'next/link'
import type { RelacionConAlerta } from '@/lib/correlacion/types'

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  progresion:  { label: 'PROGRESIÓN',  className: 'bg-sky-100 text-sky-700' },
  deroga:      { label: 'DEROGA',      className: 'bg-red-100 text-red-700' },
  modifica:    { label: 'MODIFICA',    className: 'bg-orange-100 text-orange-700' },
  complementa: { label: 'COMPLEMENTA', className: 'bg-emerald-100 text-emerald-700' },
}

interface TimelineNormativaProps {
  relaciones: RelacionConAlerta[]
  alertaActualId: string
  alertaActualTitulo: string
  alertaActualFecha: string | null
}

function fmtMes(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
}

export function TimelineNormativa({
  relaciones,
  alertaActualId,
  alertaActualTitulo,
  alertaActualFecha,
}: TimelineNormativaProps) {
  // Build timeline: related norms + current alert, sorted by date ascending
  const nodes = [
    ...relaciones.map(r => ({
      id: r.alerta_id === alertaActualId ? r.alerta_relacionada_id : r.alerta_id,
      titulo: r.titulo,
      fecha: r.fecha_publicacion,
      fuente: r.fuente,
      tipo_relacion: r.tipo_relacion,
      esCurrent: false,
    })),
    {
      id: alertaActualId,
      titulo: alertaActualTitulo,
      fecha: alertaActualFecha,
      fuente: '',
      tipo_relacion: null,
      esCurrent: true,
    },
  ].sort((a, b) => {
    if (!a.fecha) return -1
    if (!b.fecha) return 1
    return a.fecha.localeCompare(b.fecha)
  })

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />

      <ol className="space-y-5">
        {nodes.map((node, i) => {
          const badge = node.tipo_relacion ? TIPO_BADGE[node.tipo_relacion] : null
          return (
            <li key={node.id} className="relative">
              {/* Dot */}
              <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 ${
                node.esCurrent
                  ? 'bg-sky-500 border-sky-500'
                  : 'bg-white border-slate-300'
              }`} />

              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-400 font-medium">{fmtMes(node.fecha)}</p>
                {node.esCurrent ? (
                  <p className="text-sm font-bold text-slate-900 leading-snug">{node.titulo}</p>
                ) : (
                  <Link
                    href={`/alerta/${node.id}`}
                    className="text-sm font-medium text-slate-700 hover:text-sky-600 leading-snug line-clamp-2 block"
                  >
                    {node.titulo}
                  </Link>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {node.fuente && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {node.fuente}
                    </span>
                  )}
                  {badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                  {node.esCurrent && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">
                      ESTA NORMA
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/subscriber/TimelineNormativa.tsx
git commit -m "feat: add TimelineNormativa subscriber component"
```

---

## Task 11: Subscriber list component

**Files:**
- Create: `components/subscriber/ListaRelaciones.tsx`

- [ ] **Step 1: Create `components/subscriber/ListaRelaciones.tsx`**

```tsx
// components/subscriber/ListaRelaciones.tsx
import Link from 'next/link'
import type { RelacionConAlerta } from '@/lib/correlacion/types'

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  progresion:  { label: 'PROGRESIÓN',  className: 'bg-sky-100 text-sky-700' },
  deroga:      { label: 'DEROGA',      className: 'bg-red-100 text-red-700' },
  modifica:    { label: 'MODIFICA',    className: 'bg-orange-100 text-orange-700' },
  complementa: { label: 'COMPLEMENTA', className: 'bg-emerald-100 text-emerald-700' },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface ListaRelacionesProps {
  relaciones: RelacionConAlerta[]
  alertaActualId: string
}

export function ListaRelaciones({ relaciones, alertaActualId }: ListaRelacionesProps) {
  const sorted = [...relaciones].sort((a, b) => (b.score_similitud ?? 0) - (a.score_similitud ?? 0))

  return (
    <ul className="space-y-3">
      {sorted.map(r => {
        const otherId = r.alerta_id === alertaActualId ? r.alerta_relacionada_id : r.alerta_id
        const badge = TIPO_BADGE[r.tipo_relacion] ?? TIPO_BADGE.progresion
        return (
          <li key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <Link
                href={`/alerta/${otherId}`}
                className="text-sm font-semibold text-slate-800 hover:text-sky-600 leading-snug flex-1"
              >
                {r.titulo}
              </Link>
              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-1">
              {r.fuente} · {fmtDate(r.fecha_publicacion)}
            </p>
            {r.razon && (
              <p className="text-xs text-slate-600 italic">{r.razon}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/subscriber/ListaRelaciones.tsx
git commit -m "feat: add ListaRelaciones subscriber component"
```

---

## Task 12: Subscriber alerta detail page — wire in evolution section

**Files:**
- Modify: `app/(subscriber)/alerta/[id]/page.tsx`

- [ ] **Step 1: Add imports to the detail page**

At the top of `app/(subscriber)/alerta/[id]/page.tsx`, add after the existing imports:

```ts
import { TimelineNormativa } from '@/components/subscriber/TimelineNormativa'
import { ListaRelaciones } from '@/components/subscriber/ListaRelaciones'
import type { RelacionConAlerta } from '@/lib/correlacion/types'
```

- [ ] **Step 2: Fetch relations server-side**

In the `AlertaDetailPage` function, after fetching `alerta`, add a server-side relaciones query using the same two-step approach as the API route (avoids Supabase FK ambiguity):

```ts
  // Fetch relations — two-step to avoid Supabase FK ambiguity (two FKs to alertas)
  const [{ data: asNew }, { data: asOld }] = await Promise.all([
    db
      .from('alerta_relaciones')
      .select('id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en')
      .eq('alerta_id', id),
    db
      .from('alerta_relaciones')
      .select('id, alerta_id, alerta_relacionada_id, tipo_relacion, score_similitud, razon, detectada_en')
      .eq('alerta_relacionada_id', id),
  ])

  const allRelRows = [...(asNew ?? []), ...(asOld ?? [])]

  let relaciones: RelacionConAlerta[] = []

  if (allRelRows.length > 0) {
    const otherIds = allRelRows.map((r: any) =>
      r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id
    )
    const { data: alertasData } = await db
      .from('alertas')
      .select('id, titulo, fuente, fecha_publicacion, url')
      .in('id', otherIds)

    const alertaMap = new Map((alertasData ?? []).map((a: any) => [a.id, a]))
    const seen = new Set<string>()

    relaciones = allRelRows
      .filter((r: any) => {
        const key = r.alerta_id < r.alerta_relacionada_id
          ? `${r.alerta_id}-${r.alerta_relacionada_id}`
          : `${r.alerta_relacionada_id}-${r.alerta_id}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((r: any) => {
        const otherId = r.alerta_id === id ? r.alerta_relacionada_id : r.alerta_id
        const a = alertaMap.get(otherId)
        return {
          id: r.id,
          alerta_id: r.alerta_id,
          alerta_relacionada_id: r.alerta_relacionada_id,
          tipo_relacion: r.tipo_relacion,
          score_similitud: r.score_similitud,
          razon: r.razon,
          detectada_en: r.detectada_en,
          titulo: a?.titulo ?? '',
          fuente: a?.fuente ?? '',
          fecha_publicacion: a?.fecha_publicacion ?? null,
          url: a?.url ?? '',
        } as RelacionConAlerta
      })
  }
```

- [ ] **Step 3: Add "Evolución normativa" section to the JSX**

At the end of the `return` block in `AlertaDetailPage`, just before the closing `</div>`, add the evolution section. Place it after the `deroga_modifica` details block:

```tsx
      {/* ── Evolución normativa (Pro) ── */}
      {relaciones.length > 0 && (
        isPro ? (
          <div className="mt-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                Evolución normativa
              </p>
              {relaciones.length >= 2 && (
                <div className="mb-5">
                  <TimelineNormativa
                    relaciones={relaciones}
                    alertaActualId={id}
                    alertaActualTitulo={alerta.titulo}
                    alertaActualFecha={alerta.fecha_publicacion}
                  />
                </div>
              )}
              <ListaRelaciones relaciones={relaciones} alertaActualId={id} />
            </div>
          </div>
        ) : (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-1">🔗 Evolución normativa — plan Pro</p>
            <p className="text-xs text-slate-500 mb-3">
              Ve cómo esta norma se relaciona con regulaciones anteriores y la evolución del tema.
            </p>
            <a
              href="/cuenta#planes"
              className="inline-block bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
            >
              Ver planes Pro →
            </a>
          </div>
        )
      )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add app/(subscriber)/alerta/[id]/page.tsx
git commit -m "feat: add evolución normativa section to subscriber alert detail (Pro-gated)"
```

---

## Task 13: End-to-end manual verification

- [ ] **Step 1: Run the development server**

```bash
npm run dev
```

- [ ] **Step 2: Test the admin portal**

1. Navigate to http://localhost:3000/admin/editorial
2. If there are existing alerts in `pendiente_revision` or `aprobada` state, open one
3. The "Normativa relacionada" section should appear at the bottom — it will show "No se han detectado normativas relacionadas" since pipeline hasn't run yet with the new step

- [ ] **Step 3: Test the subscriber portal**

1. Navigate to http://localhost:3000/alerta/[any-existing-alert-id]
2. For a Pro user: the "Evolución normativa" section should not appear if there are no relations yet (correct — `relaciones.length > 0` guards it)
3. For a free user: same — section hidden since no relations exist

- [ ] **Step 4: Test the pipeline correlation step**

Run the pipeline manually to process one new item and verify correlation runs without breaking:

```bash
npx tsx actions/pipeline.ts
```

Expected console output includes:
```
[correlacion] 0 relación(es) guardada(s) para alerta <uuid>
```
(or similar — no errors, no crashes)

- [ ] **Step 5: Verify Supabase table**

After pipeline run, check in Supabase Table Editor → `alerta_relaciones`. If any correlations were detected, rows should appear there.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: correlación normativa — pipeline + admin + subscriber portal complete"
```
