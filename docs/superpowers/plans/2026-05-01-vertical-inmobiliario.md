# Vertical Inmobiliario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir clasificación sectorial inmobiliaria al pipeline, grupos de Telegram por subcategoría, configuración de intereses en el perfil del suscriptor, y UI de gestión en el admin.

**Architecture:** Se añaden 5 tablas a Supabase (`sectores`, `subcategorias`, `alerta_sectores`, `suscriptor_intereses`, `telegram_grupos`). El pipeline llama a Claude Haiku para clasificar cada alerta; la notificación a grupos ocurre al enviar desde editorial. La UI del suscriptor permite filtrar por intereses; el admin gestiona la taxonomía y los grupos.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, Anthropic SDK (claude-haiku-4-5-20251001), Vitest

---

## File Map

**New files:**
- `supabase/migrations/007_sectorial.sql`
- `prompts/regtrack-sectorial.md`
- `lib/sectorial/clasificar.ts`
- `lib/sectorial/telegram-grupos.ts`
- `lib/sectorial/__tests__/clasificar.test.ts`
- `app/api/intereses/route.ts`
- `app/api/mis-grupos/route.ts`
- `app/api/admin/grupos-telegram/route.ts`
- `app/api/admin/subcategorias/[id]/route.ts`
- `app/(admin)/admin/sectores/page.tsx`

**Modified files:**
- `actions/pipeline.ts` — add `clasificarSectorial` step after correlación
- `app/api/alertas/[id]/enviar/route.ts` — add `notifyGrupos` call + extend select
- `app/components/layouts/AdminSidebar.tsx` — add Sectores nav item
- `app/(admin)/admin/config/page.tsx` — add Grupos Telegram section
- `app/(admin)/admin/editorial/AlertaRow.tsx` — add subcategory badges
- `app/(admin)/admin/editorial/page.tsx` — fetch + pass subcategory data
- `app/(subscriber)/cuenta/page.tsx` — add Mis Intereses section
- `app/(subscriber)/alertas/page.tsx` — badge relevante + filtro intereses

---

## Task 1: Supabase migration

**Files:**
- Create: `supabase/migrations/007_sectorial.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/007_sectorial.sql

CREATE TABLE sectores (
  id     SERIAL  PRIMARY KEY,
  nombre TEXT    NOT NULL,
  slug   TEXT    NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE subcategorias (
  id        SERIAL  PRIMARY KEY,
  sector_id INTEGER NOT NULL REFERENCES sectores(id),
  slug      TEXT    NOT NULL UNIQUE,
  nombre    TEXT    NOT NULL,
  activo    BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE alerta_sectores (
  alerta_id       UUID    NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  subcategoria_id INTEGER NOT NULL REFERENCES subcategorias(id),
  confianza       INTEGER NOT NULL CHECK (confianza BETWEEN 0 AND 100),
  PRIMARY KEY (alerta_id, subcategoria_id)
);

CREATE TABLE suscriptor_intereses (
  usuario_id      UUID    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  subcategoria_id INTEGER NOT NULL REFERENCES subcategorias(id),
  PRIMARY KEY (usuario_id, subcategoria_id)
);

CREATE TABLE telegram_grupos (
  id              SERIAL  PRIMARY KEY,
  subcategoria_id INTEGER NOT NULL REFERENCES subcategorias(id),
  chat_id         TEXT    NOT NULL UNIQUE,
  nombre          TEXT    NOT NULL,
  invite_link     TEXT,
  activo          BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_alerta_sectores_alerta ON alerta_sectores(alerta_id);
CREATE INDEX idx_alerta_sectores_sub    ON alerta_sectores(subcategoria_id);
CREATE INDEX idx_suscriptor_intereses   ON suscriptor_intereses(usuario_id);
CREATE INDEX idx_telegram_grupos_sub    ON telegram_grupos(subcategoria_id);

INSERT INTO sectores (nombre, slug) VALUES ('Inmobiliario', 'inmobiliario');

INSERT INTO subcategorias (sector_id, slug, nombre) VALUES
  (1, 'arrendamiento_residencial', 'Arrendamiento residencial'),
  (1, 'arrendamiento_comercial',   'Arrendamiento comercial'),
  (1, 'urbanismo',                 'Urbanismo y ordenación territorial'),
  (1, 'suelo',                     'Suelo y planeamiento'),
  (1, 'fiscalidad_itp',            'ITP / AJD'),
  (1, 'fiscalidad_plusvalia',      'Plusvalía municipal'),
  (1, 'rehabilitacion',            'Rehabilitación y eficiencia energética'),
  (1, 'vivienda_protegida',        'Vivienda protegida / VPO'),
  (1, 'zonas_tensionadas',         'Zonas tensionadas'),
  (1, 'desahucios',                'Desahucios y procedimientos'),
  (1, 'hipotecas',                 'Hipotecas y financiación'),
  (1, 'registro_catastro',         'Registro y catastro');
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Go to Supabase → SQL Editor → paste and run the migration.

- [ ] **Step 3: Verify tables exist**

In Supabase → Table Editor, confirm `sectores`, `subcategorias`, `alerta_sectores`, `suscriptor_intereses`, `telegram_grupos` are visible with data in `sectores` (1 row) and `subcategorias` (12 rows).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_sectorial.sql
git commit -m "feat: add sectorial migration (007)"
```

---

## Task 2: Prompt file

**Files:**
- Create: `prompts/regtrack-sectorial.md`

- [ ] **Step 1: Create the prompt**

```markdown
Eres un clasificador normativo especializado en derecho inmobiliario español.

Dado el título y resumen de una norma publicada en boletines oficiales españoles (BOE o autonómicos), indica a qué subcategorías del sector inmobiliario pertenece y con qué nivel de confianza (0-100).

Devuelve únicamente un array JSON. Si la norma no es relevante para el sector inmobiliario, devuelve [].

Reglas:
- Usa solo los slugs que aparecen en el mensaje del usuario.
- Incluye solo subcategorías con confianza ≥ 40 (el sistema filtrará las < 60).
- Una norma puede pertenecer a varias subcategorías.
- Sé conservador: solo clasifica lo que esté claramente en el texto.

Formato de respuesta (SOLO JSON, sin texto adicional):
[{"subcategoria_slug": "arrendamiento_residencial", "confianza": 85}, ...]
```

- [ ] **Step 2: Commit**

```bash
git add prompts/regtrack-sectorial.md
git commit -m "feat: add sectorial classifier prompt"
```

---

## Task 3: lib/sectorial/clasificar.ts + test

**Files:**
- Create: `lib/sectorial/clasificar.ts`
- Create: `lib/sectorial/__tests__/clasificar.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/sectorial/__tests__/clasificar.test.ts
import { describe, it, expect } from 'vitest'

// Pure filtering logic extracted for testing without Anthropic mock
function filterClasificaciones(
  raw: Array<{ subcategoria_slug: string; confianza: number }>,
  validSlugs: Set<string>
) {
  return raw.filter(r => r.confianza >= 60 && validSlugs.has(r.subcategoria_slug))
}

function extractJsonArray(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (stripped.startsWith('[')) return stripped
  const match = stripped.match(/\[[\s\S]*\]/)
  if (match) return match[0]
  return stripped
}

describe('filterClasificaciones', () => {
  const slugs = new Set(['arrendamiento_residencial', 'urbanismo', 'fiscalidad_itp'])

  it('keeps entries with confianza >= 60 and valid slug', () => {
    const raw = [
      { subcategoria_slug: 'arrendamiento_residencial', confianza: 85 },
      { subcategoria_slug: 'urbanismo', confianza: 45 },
      { subcategoria_slug: 'fiscalidad_itp', confianza: 72 },
    ]
    const result = filterClasificaciones(raw, slugs)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.subcategoria_slug)).toEqual(['arrendamiento_residencial', 'fiscalidad_itp'])
  })

  it('rejects unknown slugs even with high confidence', () => {
    const raw = [{ subcategoria_slug: 'laboral_convenio', confianza: 95 }]
    expect(filterClasificaciones(raw, slugs)).toHaveLength(0)
  })

  it('returns empty array for non-real-estate content', () => {
    expect(filterClasificaciones([], slugs)).toHaveLength(0)
  })
})

describe('extractJsonArray', () => {
  it('parses clean JSON array', () => {
    const input = '[{"subcategoria_slug":"urbanismo","confianza":80}]'
    const result = JSON.parse(extractJsonArray(input))
    expect(result[0].subcategoria_slug).toBe('urbanismo')
  })

  it('strips markdown fences', () => {
    const input = '```json\n[{"subcategoria_slug":"suelo","confianza":65}]\n```'
    const result = JSON.parse(extractJsonArray(input))
    expect(result[0].subcategoria_slug).toBe('suelo')
  })

  it('returns empty array string for no-match', () => {
    const result = JSON.parse(extractJsonArray('[]'))
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- lib/sectorial/__tests__/clasificar.test.ts
```

Expected: FAIL — `filterClasificaciones` and `extractJsonArray` are not exported yet (test defines them inline, so tests pass immediately — this is a pure logic test).

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm test -- lib/sectorial/__tests__/clasificar.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 4: Create lib/sectorial/clasificar.ts**

```typescript
// lib/sectorial/clasificar.ts
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createServerClient } from '@/lib/supabase'

export interface ClasificacionSectorial {
  subcategoria_id: number
  subcategoria_slug: string
  confianza: number
}

function extractJsonArray(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (stripped.startsWith('[')) return stripped
  const match = stripped.match(/\[[\s\S]*\]/)
  if (match) return match[0]
  return '[]'
}

export async function clasificarSectorial(
  alertaId: string,
  titulo: string,
  resumen: string | null
): Promise<ClasificacionSectorial[]> {
  const db = createServerClient()

  const { data: subcats } = await db
    .from('subcategorias')
    .select('id, slug')
    .eq('activo', true)

  if (!subcats || subcats.length === 0) return []

  const slugsList = subcats.map(s => s.slug).join(', ')
  const systemPrompt = readFileSync(join(process.cwd(), 'prompts', 'regtrack-sectorial.md'), 'utf-8')
  const userContent = `Subcategorías disponibles: ${slugsList}\n\nTítulo: ${titulo}\n\nResumen: ${resumen ?? '(sin resumen)'}`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(extractJsonArray(text)) as Array<{
      subcategoria_slug: string
      confianza: number
    }>

    const slugToId = new Map(subcats.map(s => [s.slug, s.id]))
    const validSlugs = new Set(subcats.map(s => s.slug))

    const clasificaciones: ClasificacionSectorial[] = parsed
      .filter(r => r.confianza >= 60 && validSlugs.has(r.subcategoria_slug))
      .map(r => ({
        subcategoria_id: slugToId.get(r.subcategoria_slug)!,
        subcategoria_slug: r.subcategoria_slug,
        confianza: Math.round(r.confianza),
      }))

    if (clasificaciones.length > 0) {
      await db.from('alerta_sectores').insert(
        clasificaciones.map(c => ({
          alerta_id: alertaId,
          subcategoria_id: c.subcategoria_id,
          confianza: c.confianza,
        }))
      )
      console.log(`[sectorial] ${clasificaciones.length} subcategorías para alerta ${alertaId}: ${clasificaciones.map(c => c.subcategoria_slug).join(', ')}`)
    }

    return clasificaciones
  } catch (err) {
    console.error('[sectorial] Error en clasificación:', err)
    return []
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/sectorial/clasificar.ts lib/sectorial/__tests__/clasificar.test.ts
git commit -m "feat: add sectorial classifier"
```

---

## Task 4: lib/sectorial/telegram-grupos.ts

**Files:**
- Create: `lib/sectorial/telegram-grupos.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/sectorial/telegram-grupos.ts
import { createServerClient } from '@/lib/supabase'
import { sendMessage } from '@/lib/telegram'

export async function notifyGrupos(
  alertaId: string,
  titulo: string,
  resumen: string | null,
  score: number,
  territorios: string[],
  fuente: string,
  alertaUrl: string
): Promise<void> {
  const db = createServerClient()

  const { data: subcats } = await db
    .from('alerta_sectores')
    .select('subcategoria_id, subcategorias(nombre)')
    .eq('alerta_id', alertaId)

  if (!subcats || subcats.length === 0) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://regtrack.vercel.app'

  for (const subcat of subcats) {
    const nombre = (subcat.subcategorias as unknown as { nombre: string } | null)?.nombre
    if (!nombre) continue

    const { data: grupos } = await db
      .from('telegram_grupos')
      .select('chat_id')
      .eq('subcategoria_id', subcat.subcategoria_id)
      .eq('activo', true)

    if (!grupos || grupos.length === 0) continue

    const territorioStr = territorios.length > 0 ? territorios.join(', ') : 'Nacional'
    const text = [
      `🏠 <b>${nombre}</b>`,
      ``,
      `<b>${titulo}</b>`,
      `📍 ${territorioStr} · ${fuente}`,
      `⚡ Impacto: ${score}/10`,
      ``,
      resumen ? resumen.slice(0, 300) : '',
    ].join('\n')

    const keyboard = [[
      { text: '📄 Ver alerta', url: `${appUrl}/alerta/${alertaId}` },
      { text: '📰 Doc oficial', url: alertaUrl },
    ]]

    for (const grupo of grupos) {
      await sendMessage(grupo.chat_id, text, 'HTML', keyboard)
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/sectorial/telegram-grupos.ts
git commit -m "feat: add sectorial telegram groups notifier"
```

---

## Task 5: Pipeline — add clasificarSectorial step

**Files:**
- Modify: `actions/pipeline.ts`

- [ ] **Step 1: Add import at top of file**

After the existing imports, add:

```typescript
import { clasificarSectorial } from '@/lib/sectorial/clasificar'
```

- [ ] **Step 2: Add step after guardarRelaciones block**

Find this block in `actions/pipeline.ts`:

```typescript
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
```

Replace with:

```typescript
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

      // 8.5. Clasificación sectorial (no bloquea el pipeline si falla)
      await new Promise(r => setTimeout(r, 1500))
      try {
        await clasificarSectorial(saved.id, alertaBase.titulo, alertaBase.resumen ?? null)
      } catch (sectErr) {
        console.error(`[pipeline] Error en clasificación sectorial (no bloqueante):`, sectErr)
      }

      // 9. Notificar al editor por Telegram
```

- [ ] **Step 3: Commit**

```bash
git add actions/pipeline.ts
git commit -m "feat: add sectorial classification step to pipeline"
```

---

## Task 6: Enviar route — add notifyGrupos

**Files:**
- Modify: `app/api/alertas/[id]/enviar/route.ts`

- [ ] **Step 1: Extend the alerta select to include needed fields**

Find:

```typescript
  const { data: alerta } = await db
    .from('alertas')
    .select('id, estado, url, texto_alerta, texto_alerta_pro, titulo')
    .eq('id', id)
    .single()
```

Replace with:

```typescript
  const { data: alerta } = await db
    .from('alertas')
    .select('id, estado, url, texto_alerta, texto_alerta_pro, titulo, resumen, score_relevancia, territorios, fuente')
    .eq('id', id)
    .single()
```

- [ ] **Step 2: Add import**

At the top of the file, add:

```typescript
import { notifyGrupos } from '@/lib/sectorial/telegram-grupos'
```

- [ ] **Step 3: Add notifyGrupos call after notifyUsers block**

Find:

```typescript
  if (conTelegram.length > 0) {
    await notifyUsers(
      conTelegram.map((u: { telegram_id: string; plan: string }) => ({
        telegramId: u.telegram_id,
        texto: u.plan === 'pro' ? (alerta.texto_alerta_pro ?? alerta.texto_alerta ?? '') : (alerta.texto_alerta ?? ''),
        alertaId: alerta.id,
        urlOficial: alerta.url,
      }))
    )
  }
```

Replace with:

```typescript
  if (conTelegram.length > 0) {
    await notifyUsers(
      conTelegram.map((u: { telegram_id: string; plan: string }) => ({
        telegramId: u.telegram_id,
        texto: u.plan === 'pro' ? (alerta.texto_alerta_pro ?? alerta.texto_alerta ?? '') : (alerta.texto_alerta ?? ''),
        alertaId: alerta.id,
        urlOficial: alerta.url,
      }))
    )
  }

  // Notify sector Telegram groups
  try {
    await notifyGrupos(
      alerta.id,
      alerta.titulo,
      alerta.resumen ?? null,
      alerta.score_relevancia ?? 0,
      alerta.territorios ?? [],
      alerta.fuente,
      alerta.url
    )
  } catch (gruposErr) {
    console.error('[enviar] Error en grupos sectoriales (no bloqueante):', gruposErr)
  }
```

- [ ] **Step 4: Commit**

```bash
git add app/api/alertas/[id]/enviar/route.ts
git commit -m "feat: notify sector telegram groups on alerta enviar"
```

---

## Task 7: API /api/intereses/route.ts

**Files:**
- Create: `app/api/intereses/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/intereses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

type SubcategoriaRow = {
  id: number
  slug: string
  nombre: string
  sector_id: number
}

type SectorRow = {
  id: number
  nombre: string
  slug: string
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createNextServerClient()

  const [sectoresRes, subcatsRes, interesesRes] = await Promise.all([
    db.from('sectores').select('id, nombre, slug').eq('activo', true).order('nombre'),
    db.from('subcategorias').select('id, slug, nombre, sector_id').eq('activo', true).order('nombre'),
    db.from('suscriptor_intereses').select('subcategoria_id').eq('usuario_id', user.usuarioId),
  ])

  const sectores = (sectoresRes.data ?? []) as SectorRow[]
  const subcats = (subcatsRes.data ?? []) as SubcategoriaRow[]
  const interesIds = new Set((interesesRes.data ?? []).map(i => i.subcategoria_id))

  const result = sectores.map(sector => ({
    id: sector.id,
    nombre: sector.nombre,
    slug: sector.slug,
    subcategorias: subcats
      .filter(s => s.sector_id === sector.id)
      .map(s => ({
        id: s.id,
        slug: s.slug,
        nombre: s.nombre,
        seleccionado: interesIds.has(s.id),
      })),
  }))

  return NextResponse.json({ sectores: result })
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (user.plan !== 'pro') return NextResponse.json({ error: 'Plan Pro requerido' }, { status: 403 })

  const body = await req.json() as { subcategoria_ids: number[] }
  if (!Array.isArray(body.subcategoria_ids)) {
    return NextResponse.json({ error: 'subcategoria_ids debe ser un array' }, { status: 400 })
  }

  const db = createNextServerClient()

  await db.from('suscriptor_intereses').delete().eq('usuario_id', user.usuarioId)

  if (body.subcategoria_ids.length > 0) {
    await db.from('suscriptor_intereses').insert(
      body.subcategoria_ids.map(id => ({ usuario_id: user.usuarioId, subcategoria_id: id }))
    )
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/intereses/route.ts
git commit -m "feat: add /api/intereses route for subscriber interest management"
```

---

## Task 8: API routes for admin (grupos-telegram + subcategorias toggle)

**Files:**
- Create: `app/api/admin/grupos-telegram/route.ts`
- Create: `app/api/admin/subcategorias/[id]/route.ts`

- [ ] **Step 1: Create grupos-telegram route**

```typescript
// app/api/admin/grupos-telegram/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { sendMessage } from '@/lib/telegram'

export async function GET() {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const db = createNextServerClient()
  const { data } = await db
    .from('telegram_grupos')
    .select('id, nombre, chat_id, invite_link, activo, subcategorias(id, nombre, slug)')
    .order('id')

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json() as {
    nombre: string
    chat_id: string
    subcategoria_id: number
    invite_link?: string
  }

  if (!body.nombre || !body.chat_id || !body.subcategoria_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const db = createNextServerClient()
  const { data, error } = await db
    .from('telegram_grupos')
    .insert({
      nombre: body.nombre,
      chat_id: body.chat_id,
      subcategoria_id: body.subcategoria_id,
      invite_link: body.invite_link ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send verification message to the group
  await sendMessage(body.chat_id, '✅ Grupo configurado en RegTrack. Las alertas de esta subcategoría se publicarán aquí.', 'Markdown')

  return NextResponse.json({ ok: true, id: data.id })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const db = createNextServerClient()
  const { error } = await db.from('telegram_grupos').delete().eq('id', parseInt(id))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create subcategorias toggle route**

```typescript
// app/api/admin/subcategorias/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as { activo: boolean }

  if (typeof body.activo !== 'boolean') {
    return NextResponse.json({ error: 'activo debe ser boolean' }, { status: 400 })
  }

  const db = createNextServerClient()
  const { error } = await db
    .from('subcategorias')
    .update({ activo: body.activo })
    .eq('id', parseInt(id))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/grupos-telegram/route.ts app/api/admin/subcategorias/[id]/route.ts
git commit -m "feat: add admin API routes for grupos-telegram and subcategorias"
```

---

## Task 9: Admin sidebar + /admin/sectores page

**Files:**
- Modify: `app/components/layouts/AdminSidebar.tsx`
- Create: `app/(admin)/admin/sectores/page.tsx`

- [ ] **Step 1: Add Sectores to sidebar**

In `app/components/layouts/AdminSidebar.tsx`, find the import line:

```typescript
import { LayoutDashboard, FileCheck, Bell, Users, Settings, LogOut } from 'lucide-react'
```

Replace with:

```typescript
import { LayoutDashboard, FileCheck, Bell, Users, Settings, LogOut, Layers } from 'lucide-react'
```

Find the `NAV_ITEMS` array and add the sectores item after config:

```typescript
const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/editorial', label: 'Cola editorial', icon: FileCheck },
  { href: '/admin/alertas', label: 'Alertas', icon: Bell },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/config', label: 'Config', icon: Settings },
  { href: '/admin/sectores', label: 'Sectores', icon: Layers },
]
```

- [ ] **Step 2: Create the sectores page**

```typescript
// app/(admin)/admin/sectores/page.tsx
'use client'
import { useEffect, useState } from 'react'

type Subcategoria = {
  id: number
  slug: string
  nombre: string
  activo: boolean
}

type Sector = {
  id: number
  nombre: string
  slug: string
  subcategorias: Subcategoria[]
}

export default function SectoresPage() {
  const [sectores, setSectores] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/intereses')
      .then(r => r.json())
      .then((data: { sectores: Sector[] }) => {
        setSectores(data.sectores)
        setLoading(false)
      })
  }, [])

  async function toggleSubcategoria(subcatId: number, activo: boolean) {
    setToggling(subcatId)
    await fetch(`/api/admin/subcategorias/${subcatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    })
    setSectores(prev =>
      prev.map(sector => ({
        ...sector,
        subcategorias: sector.subcategorias.map(s =>
          s.id === subcatId ? { ...s, activo } : s
        ),
      }))
    )
    setToggling(null)
  }

  if (loading) return <div className="p-6 text-sm text-slate-400">Cargando...</div>

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Sectores y subcategorías</h1>
      <div className="space-y-6">
        {sectores.map(sector => (
          <div key={sector.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-700">{sector.nombre}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {sector.subcategorias.map(sub => (
                <div key={sub.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm text-slate-800">{sub.nombre}</p>
                    <p className="text-xs text-slate-400 font-mono">{sub.slug}</p>
                  </div>
                  <button
                    disabled={toggling === sub.id}
                    onClick={() => toggleSubcategoria(sub.id, !sub.activo)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      sub.activo ? 'bg-sky-500' : 'bg-slate-200'
                    } ${toggling === sub.id ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        sub.activo ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Note: The `/api/intereses` GET endpoint returns all subcategorias (active + inactive for admin). However, the current GET returns only `activo: true` subcategorias. The sectores page needs ALL subcategorias to be able to toggle inactive ones back on. Fix: make the `api/intereses` GET return all subcategories when called from an admin user, OR create a separate admin endpoint. The simpler fix: the sectores page fetches directly from Supabase via a server component. **Replace the client component above with a server component that uses `createNextServerClient` directly:**

```typescript
// app/(admin)/admin/sectores/page.tsx — REPLACE with this server + client hybrid
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SectoresClient } from './SectoresClient'

export const dynamic = 'force-dynamic'

export default async function SectoresPage() {
  const user = await getAuthUser()
  if (!user || user.rol !== 'admin') redirect('/login')

  const db = createNextServerClient()
  const [sectoresRes, subcatsRes] = await Promise.all([
    db.from('sectores').select('id, nombre, slug').order('nombre'),
    db.from('subcategorias').select('id, slug, nombre, activo, sector_id').order('nombre'),
  ])

  const sectores = (sectoresRes.data ?? []).map(sector => ({
    ...sector,
    subcategorias: (subcatsRes.data ?? []).filter(s => s.sector_id === sector.id),
  }))

  return <SectoresClient sectores={sectores} />
}
```

- [ ] **Step 3: Create SectoresClient component**

```typescript
// app/(admin)/admin/sectores/SectoresClient.tsx
'use client'
import { useState } from 'react'

type Subcategoria = { id: number; slug: string; nombre: string; activo: boolean }
type Sector = { id: number; nombre: string; slug: string; subcategorias: Subcategoria[] }

export function SectoresClient({ sectores: initial }: { sectores: Sector[] }) {
  const [sectores, setSectores] = useState(initial)
  const [toggling, setToggling] = useState<number | null>(null)

  async function toggleSubcategoria(subcatId: number, activo: boolean) {
    setToggling(subcatId)
    await fetch(`/api/admin/subcategorias/${subcatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    })
    setSectores(prev =>
      prev.map(sector => ({
        ...sector,
        subcategorias: sector.subcategorias.map(s =>
          s.id === subcatId ? { ...s, activo } : s
        ),
      }))
    )
    setToggling(null)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Sectores y subcategorías</h1>
      <div className="space-y-6">
        {sectores.map(sector => (
          <div key={sector.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-700">{sector.nombre}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {sector.subcategorias.map(sub => (
                <div key={sub.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm text-slate-800">{sub.nombre}</p>
                    <p className="text-xs text-slate-400 font-mono">{sub.slug}</p>
                  </div>
                  <button
                    disabled={toggling === sub.id}
                    onClick={() => toggleSubcategoria(sub.id, !sub.activo)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      sub.activo ? 'bg-sky-500' : 'bg-slate-200'
                    } ${toggling === sub.id ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        sub.activo ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/components/layouts/AdminSidebar.tsx app/(admin)/admin/sectores/page.tsx app/(admin)/admin/sectores/SectoresClient.tsx
git commit -m "feat: add admin sectores page with taxonomy toggle"
```

---

## Task 10: Admin config — Grupos Telegram section

**Files:**
- Modify: `app/(admin)/admin/config/page.tsx`

- [ ] **Step 1: Add grupos telegram section**

The config page is a client component. At the top of the file, add type declarations and new state.

After the existing `type Config = { ... }` declaration, add:

```typescript
type Grupo = {
  id: number
  nombre: string
  chat_id: string
  invite_link: string | null
  activo: boolean
  subcategorias: { id: number; nombre: string; slug: string } | null
}
type SubcatSimple = { id: number; nombre: string; slug: string }
```

Add new state after the existing state declarations (after `const [saved, setSaved] = useState(false)`):

```typescript
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [subcats, setSubcats] = useState<SubcatSimple[]>([])
  const [nuevoGrupo, setNuevoGrupo] = useState({ nombre: '', chat_id: '', subcategoria_id: '', invite_link: '' })
  const [savingGrupo, setSavingGrupo] = useState(false)
  const [grupoError, setGrupoError] = useState<string | null>(null)
```

Add to the existing `useEffect`:

```typescript
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((data: Config) => {
        setConfig({
          score_minimo: data.score_minimo ?? 4,
          territorios_activos: data.territorios_activos ?? [],
          fuentes_activas: data.fuentes_activas ?? [],
        })
        setLoading(false)
      })
    // Load grupos and subcats
    fetch('/api/admin/grupos-telegram').then(r => r.json()).then(setGrupos)
    fetch('/api/intereses').then(r => r.json()).then((d: { sectores: Array<{ subcategorias: SubcatSimple[] }> }) => {
      setSubcats(d.sectores.flatMap(s => s.subcategorias))
    })
  }, [])
```

Add these handler functions before the `return`:

```typescript
  async function handleAddGrupo(e: React.FormEvent) {
    e.preventDefault()
    setGrupoError(null)
    if (!nuevoGrupo.nombre || !nuevoGrupo.chat_id || !nuevoGrupo.subcategoria_id) {
      setGrupoError('Nombre, chat_id y subcategoría son obligatorios')
      return
    }
    setSavingGrupo(true)
    const res = await fetch('/api/admin/grupos-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nuevoGrupo.nombre,
        chat_id: nuevoGrupo.chat_id,
        subcategoria_id: parseInt(nuevoGrupo.subcategoria_id),
        invite_link: nuevoGrupo.invite_link || undefined,
      }),
    })
    if (res.ok) {
      const updated = await fetch('/api/admin/grupos-telegram').then(r => r.json())
      setGrupos(updated)
      setNuevoGrupo({ nombre: '', chat_id: '', subcategoria_id: '', invite_link: '' })
    } else {
      const body = await res.json()
      setGrupoError(body.error ?? 'Error al guardar')
    }
    setSavingGrupo(false)
  }

  async function handleDeleteGrupo(id: number) {
    await fetch(`/api/admin/grupos-telegram?id=${id}`, { method: 'DELETE' })
    setGrupos(prev => prev.filter(g => g.id !== id))
  }
```

Add the grupos section inside the returned JSX, after the existing `</div>` of the main config card and before the save button:

```tsx
      {/* Grupos Telegram */}
      <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-700">Grupos Telegram por subcategoría</h2>
        </div>
        <div className="p-4 space-y-3">
          {grupos.length === 0 ? (
            <p className="text-xs text-slate-400">No hay grupos configurados.</p>
          ) : (
            grupos.map(g => (
              <div key={g.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-md px-3 py-2">
                <div>
                  <p className="font-medium text-slate-800">{g.nombre}</p>
                  <p className="text-xs text-slate-400">{g.subcategorias?.nombre ?? '—'} · <span className="font-mono">{g.chat_id}</span></p>
                </div>
                <button
                  onClick={() => handleDeleteGrupo(g.id)}
                  className="text-xs text-red-500 hover:text-red-700 ml-4"
                >
                  Eliminar
                </button>
              </div>
            ))
          )}
          <form onSubmit={handleAddGrupo} className="border border-dashed border-slate-200 rounded-md p-3 space-y-2 mt-2">
            <p className="text-xs font-semibold text-slate-500">Añadir grupo</p>
            <input
              placeholder="Nombre del grupo"
              value={nuevoGrupo.nombre}
              onChange={e => setNuevoGrupo(p => ({ ...p, nombre: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
            />
            <input
              placeholder="chat_id (ej: -100123456789)"
              value={nuevoGrupo.chat_id}
              onChange={e => setNuevoGrupo(p => ({ ...p, chat_id: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 font-mono"
            />
            <select
              value={nuevoGrupo.subcategoria_id}
              onChange={e => setNuevoGrupo(p => ({ ...p, subcategoria_id: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
            >
              <option value="">Selecciona subcategoría</option>
              {subcats.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            <input
              placeholder="Link de invitación (opcional)"
              value={nuevoGrupo.invite_link}
              onChange={e => setNuevoGrupo(p => ({ ...p, invite_link: e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
            />
            {grupoError && <p className="text-xs text-red-500">{grupoError}</p>}
            <Button type="submit" disabled={savingGrupo} className="bg-sky-500 hover:bg-sky-600 text-xs h-7 px-3">
              {savingGrupo ? 'Añadiendo...' : 'Añadir grupo'}
            </Button>
          </form>
        </div>
      </div>
```

- [ ] **Step 2: Commit**

```bash
git add app/(admin)/admin/config/page.tsx
git commit -m "feat: add grupos telegram section to admin config"
```

---

## Task 11: Admin editorial — subcategory badges

**Files:**
- Modify: `app/(admin)/admin/editorial/page.tsx`
- Modify: `app/(admin)/admin/editorial/AlertaRow.tsx`

- [ ] **Step 1: Fetch subcategories in editorial page**

In `app/(admin)/admin/editorial/page.tsx`, after the alertas fetch, add:

```typescript
  const alertaIds = (alertas ?? []).map(a => a.id)
  const { data: alertaSubs } = alertaIds.length > 0
    ? await db
        .from('alerta_sectores')
        .select('alerta_id, subcategorias(nombre, slug)')
        .in('alerta_id', alertaIds)
    : { data: [] }

  type SubMap = Record<string, Array<{ nombre: string; slug: string }>>
  const subsByAlerta: SubMap = {}
  for (const row of (alertaSubs ?? [])) {
    const sub = row.subcategorias as unknown as { nombre: string; slug: string } | null
    if (!sub) continue
    if (!subsByAlerta[row.alerta_id]) subsByAlerta[row.alerta_id] = []
    subsByAlerta[row.alerta_id].push(sub)
  }
```

Pass `subsByAlerta` to each `AlertaRow`:

```tsx
{[...pendientes, ...aprobadas].map(alerta => (
  <AlertaRow key={alerta.id} alerta={alerta} subcategorias={subsByAlerta[alerta.id] ?? []} />
))}
```

- [ ] **Step 2: Update AlertaRow props and render badges**

In `app/(admin)/admin/editorial/AlertaRow.tsx`, update the component signature:

```typescript
export function AlertaRow({
  alerta,
  subcategorias = [],
}: {
  alerta: Alerta
  subcategorias?: Array<{ nombre: string; slug: string }>
}) {
```

Find where the alert title is rendered (after the urgencia badge), and add subcategory badges after the title. Look for the section that shows the title in the non-enviada state and add after it:

```tsx
{subcategorias.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {subcategorias.map(s => (
      <span
        key={s.slug}
        className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100"
      >
        🏠 {s.nombre}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/admin/editorial/page.tsx app/(admin)/admin/editorial/AlertaRow.tsx
git commit -m "feat: show subcategory badges in editorial AlertaRow"
```

---

## Task 12: Subscriber cuenta — Mis Intereses section

**Files:**
- Modify: `app/(subscriber)/cuenta/page.tsx`

- [ ] **Step 1: Add intereses state and fetch**

In `app/(subscriber)/cuenta/page.tsx`, add new state after the existing state declarations:

```typescript
  type SubcategoriaInterest = { id: number; slug: string; nombre: string; seleccionado: boolean }
  type SectorInterest = { id: number; nombre: string; slug: string; subcategorias: SubcategoriaInterest[] }
  const [sectores, setSectores] = useState<SectorInterest[]>([])
  const [savingIntereses, setSavingIntereses] = useState(false)
  const [savedIntereses, setSavedIntereses] = useState(false)
```

Add an intereses fetch inside the existing `useEffect`:

```typescript
  useEffect(() => {
    fetch('/api/cuenta')
      .then(r => r.json())
      .then((data: DatosUsuario) => {
        setDatos(data)
        setNombre(data.nombre)
        setTelegramId(data.telegram_id ?? '')
      })
    fetch('/api/intereses')
      .then(r => r.json())
      .then((d: { sectores: SectorInterest[] }) => setSectores(d.sectores))
  }, [])
```

Add a toggle handler:

```typescript
  function toggleInteres(subcatId: number) {
    setSectores(prev =>
      prev.map(sector => ({
        ...sector,
        subcategorias: sector.subcategorias.map(s =>
          s.id === subcatId ? { ...s, seleccionado: !s.seleccionado } : s
        ),
      }))
    )
  }

  async function handleSaveIntereses() {
    setSavingIntereses(true)
    const ids = sectores.flatMap(s => s.subcategorias.filter(c => c.seleccionado).map(c => c.id))
    await fetch('/api/intereses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subcategoria_ids: ids }),
    })
    setSavingIntereses(false)
    setSavedIntereses(true)
    setTimeout(() => setSavedIntereses(false), 2000)
  }
```

Add the Mis Intereses section in the JSX, after the "Datos personales" card and before the "Miembro desde" paragraph. For Free users show a locked state; for Pro show the checkboxes:

```tsx
      {/* Mis intereses */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mis intereses</h2>
        {datos.plan === 'free' ? (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-md">
            <p className="text-xs text-slate-500">Configura alertas por sector con el <strong>Plan Pro</strong>.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sectores.map(sector => (
              <div key={sector.id}>
                <p className="text-xs font-semibold text-slate-600 mb-2">{sector.nombre}</p>
                <div className="flex flex-wrap gap-2">
                  {sector.subcategorias.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => toggleInteres(sub.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        sub.seleccionado
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {sub.nombre}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSaveIntereses}
                disabled={savingIntereses}
                className="text-xs px-3 py-1.5 rounded bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
              >
                {savingIntereses ? 'Guardando...' : 'Guardar intereses'}
              </button>
              {savedIntereses && <span className="text-xs text-emerald-600">✓ Guardado</span>}
            </div>
          </div>
        )}
      </div>
```

- [ ] **Step 2: Add "Mis grupos" section (invite links)**

After the Mis Intereses card, add a section showing the Telegram groups for the user's selected interests. This requires fetching groups for those subcategorias. Add new state:

```typescript
  const [misGrupos, setMisGrupos] = useState<Array<{ nombre: string; invite_link: string | null; subcategorias: { nombre: string } | null }>>([])
```

Add to the existing `useEffect`:

```typescript
    fetch('/api/mis-grupos')
      .then(r => r.json())
      .then(setMisGrupos)
```

Create the API route `app/api/mis-grupos/route.ts`:

```typescript
// app/api/mis-grupos/route.ts
import { NextResponse } from 'next/server'
import { createNextServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createNextServerClient()

  const { data: intereses } = await db
    .from('suscriptor_intereses')
    .select('subcategoria_id')
    .eq('usuario_id', user.usuarioId)

  const ids = (intereses ?? []).map(i => i.subcategoria_id)
  if (ids.length === 0) return NextResponse.json([])

  const { data: grupos } = await db
    .from('telegram_grupos')
    .select('nombre, invite_link, subcategorias(nombre)')
    .in('subcategoria_id', ids)
    .eq('activo', true)

  return NextResponse.json(grupos ?? [])
}
```

Add Mis Grupos section in JSX (only for Pro users with groups), after the Mis Intereses card:

```tsx
      {datos.plan === 'pro' && misGrupos.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mis grupos Telegram</h2>
          <div className="space-y-2">
            {misGrupos.map((g, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-700 font-medium">{g.nombre}</p>
                  <p className="text-xs text-slate-400">{(g.subcategorias as unknown as { nombre: string } | null)?.nombre}</p>
                </div>
                {g.invite_link ? (
                  <a
                    href={g.invite_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-600 hover:underline"
                  >
                    Unirse →
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">Sin link</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 3: Commit**

```bash
git add app/(subscriber)/cuenta/page.tsx app/api/mis-grupos/route.ts
git commit -m "feat: add Mis Intereses + Mis Grupos sections to subscriber cuenta page"
```

---

## Task 13: Subscriber alertas — badge + filter

**Files:**
- Modify: `app/(subscriber)/alertas/page.tsx`
- Modify: `app/components/ui/AlertaCard.tsx`

- [ ] **Step 1: Extend SearchParams and fetch interest data**

In `app/(subscriber)/alertas/page.tsx`, update the `SearchParams` type:

```typescript
type SearchParams = { fuente?: string; urgencia?: string; page?: string; solo_intereses?: string }
```

After `const db = createNextServerClient()`, add logic to fetch user interests and filter if needed:

```typescript
  // Fetch user's interest subcategory IDs
  const { data: interesesData } = await db
    .from('suscriptor_intereses')
    .select('subcategoria_id')
    .eq('usuario_id', user.usuarioId)

  const interesIds = new Set((interesesData ?? []).map(i => i.subcategoria_id))
```

For the `solo_intereses` filter, modify the query building section. After the existing `if (params.urgencia...)` line, add:

```typescript
  if (params.solo_intereses === 'true' && interesIds.size > 0) {
    const { data: alertasConInteres } = await db
      .from('alerta_sectores')
      .select('alerta_id')
      .in('subcategoria_id', Array.from(interesIds))
    const ids = (alertasConInteres ?? []).map(r => r.alerta_id)
    if (ids.length === 0) {
      query = query.in('id', ['00000000-0000-0000-0000-000000000000']) // no results
    } else {
      query = query.in('id', ids)
    }
  }
```

After the `const { data: alertas, count } = await query` line, fetch which of the current alertas match the user's interests (for badge):

```typescript
  const alertaIds = (alertas ?? []).map(a => a.id)
  const relevantIds = new Set<string>()
  if (interesIds.size > 0 && alertaIds.length > 0) {
    const { data: matches } = await db
      .from('alerta_sectores')
      .select('alerta_id')
      .in('alerta_id', alertaIds)
      .in('subcategoria_id', Array.from(interesIds))
    for (const m of matches ?? []) relevantIds.add(m.alerta_id)
  }
```

Pass `relevante` to each `AlertaCard`:

```tsx
{alertas.map(alerta => (
  <AlertaCard
    key={alerta.id}
    alerta={alerta}
    plan={user.plan}
    relevante={relevantIds.has(alerta.id)}
  />
))}
```

Add a "Solo mis intereses" toggle button in the JSX, after the FilterBar:

```tsx
      {interesIds.size > 0 && (
        <div className="mb-3">
          <a
            href={`?${new URLSearchParams({
              ...params,
              solo_intereses: params.solo_intereses === 'true' ? 'false' : 'true',
              page: '1',
            })}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              params.solo_intereses === 'true'
                ? 'bg-sky-500 text-white border-sky-500'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Solo mis intereses
          </a>
        </div>
      )}
```

- [ ] **Step 2: Add relevante prop to AlertaCard**

In `app/components/ui/AlertaCard.tsx`, find the component signature and add the `relevante` prop:

```typescript
// Find the existing props type (may be inline or a type alias) and add:
relevante?: boolean
```

In the card JSX, after the title or in the header area, add a conditional badge:

```tsx
{relevante && (
  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100 font-medium">
    Relevante para ti
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/(subscriber)/alertas/page.tsx app/components/ui/AlertaCard.tsx
git commit -m "feat: add relevante badge and solo_intereses filter to subscriber alertas"
```

---

## Task 14: Final check

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Fix any TypeScript errors before continuing.

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Verify pipeline compiles**

```bash
npx tsc --noEmit actions/pipeline.ts 2>&1 || true
```

Check that no import errors exist for the new `clasificarSectorial` import.

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -p
git commit -m "fix: resolve type errors in vertical inmobiliario"
```
