# RAG Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un widget flotante al portal suscriptor que permite búsqueda semántica y conversación multi-turn sobre el corpus de alertas normativas de RegTrack.

**Architecture:** OpenAI `text-embedding-3-small` genera embeddings de alertas almacenados en Supabase pgvector; `match_alertas()` recupera los top-K más similares a la query; Claude Haiku sintetiza la respuesta en streaming SSE. El widget (React client component) vive en el layout del portal suscriptor y es accesible desde cualquier página.

**Tech Stack:** Next.js 16 App Router, OpenAI SDK, Anthropic SDK (ya instalado), Supabase pgvector, TypeScript, Vitest

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `supabase/migrations/007_rag_embeddings.sql` | Crear | Extensión vector, columna embedding, índice HNSW, RPC match_alertas |
| `lib/embeddings.ts` | Crear | Wrapper OpenAI: generateEmbedding(), buildEmbeddingText() |
| `app/api/rag/search/route.ts` | Crear | GET handler: embed query → match_alertas → devolver resultados |
| `app/api/rag/chat/route.ts` | Crear | POST handler: embed query → match_alertas → Claude Haiku streaming SSE |
| `scripts/backfill-embeddings.ts` | Crear | Script one-shot: genera embeddings para alertas existentes sin embedding |
| `actions/pipeline.ts` | Modificar | Añadir paso generateEmbedding() tras clasificarSectorial (no bloqueante) |
| `components/rag/types.ts` | Crear | Tipos compartidos: Message, AlertaResult, WidgetState |
| `components/rag/RagMessage.tsx` | Crear | Burbuja de mensaje (user | assistant) con streaming cursor |
| `components/rag/RagSourceCard.tsx` | Crear | Card compacta de alerta fuente con link a /alerta/[id] |
| `components/rag/RagEmptyState.tsx` | Crear | Estado inicial con 3 sugerencias de consulta |
| `components/rag/RagSearchBar.tsx` | Crear | Input + botón enviar, maneja Enter y click |
| `components/rag/RagTrigger.tsx` | Crear | Botón flotante fixed bottom-right |
| `components/rag/RagPanel.tsx` | Crear | Panel expandido: lista de mensajes + barra de búsqueda + fuentes |
| `components/rag/RagWidget.tsx` | Crear | Orquestador: estado, historial, llamadas API, composición |
| `app/(subscriber)/layout.tsx` | Modificar | Montar `<RagWidget />` dentro del layout |
| `tests/lib/embeddings.test.ts` | Crear | Tests unitarios de lib/embeddings.ts |
| `tests/api/rag-search.test.ts` | Crear | Tests del route handler GET /api/rag/search |
| `tests/api/rag-chat.test.ts` | Crear | Tests del route handler POST /api/rag/chat |

---

## Task 1: Instalar openai y configurar variable de entorno

**Files:**
- Modify: `package.json` (vía npm install)
- Modify: `.env.local` (añadir OPENAI_API_KEY)

- [ ] **Step 1: Instalar la dependencia openai**

```bash
cd "C:\Users\alf_c\Documents\Obsidian Vault\IDEAS\RegTrack"
npm install openai
```

Expected output: `added N packages` sin errores.

- [ ] **Step 2: Añadir la variable de entorno**

Abrir `.env.local` y añadir al final:

```
OPENAI_API_KEY=sk-...tu-clave-aqui...
```

- [ ] **Step 3: Verificar instalación**

```bash
node -e "const { OpenAI } = require('openai'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(rag): install openai sdk"
```

---

## Task 2: Migración Supabase — pgvector + match_alertas

**Files:**
- Create: `supabase/migrations/007_rag_embeddings.sql`

- [ ] **Step 1: Crear el archivo de migración**

Crear `supabase/migrations/007_rag_embeddings.sql` con este contenido exacto:

```sql
-- Habilitar extensión pgvector (disponible por defecto en Supabase)
create extension if not exists vector;

-- Columna para el embedding de cada alerta
alter table alertas
  add column if not exists embedding vector(1536);

-- Índice HNSW para búsqueda aproximada por similitud coseno
-- (más rápido que IVFFlat para colecciones pequeñas/medianas)
create index if not exists alertas_embedding_idx
  on alertas using hnsw (embedding vector_cosine_ops);

-- Función RPC para búsqueda semántica desde el cliente
create or replace function match_alertas(
  query_embedding vector(1536),
  match_count     int default 8
)
returns table (
  id               uuid,
  titulo           text,
  resumen          text,
  fuente           text,
  subtema          text,
  ambito           text,
  score_relevancia int,
  urgencia         text,
  territorios      jsonb,
  created_at       timestamptz,
  similarity       float
)
language sql stable as $$
  select
    id,
    titulo,
    resumen,
    fuente::text,
    subtema::text,
    ambito::text,
    score_relevancia,
    urgencia::text,
    territorios,
    created_at,
    1 - (embedding <=> query_embedding) as similarity
  from alertas
  where
    embedding is not null
    and estado::text in ('aprobada', 'enviada')
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Acceder al SQL Editor de tu proyecto Supabase (https://supabase.com/dashboard) y ejecutar el contenido del archivo. Verificar que no hay errores.

Alternativa con CLI si está configurada:
```bash
npx supabase db push
```

- [ ] **Step 3: Verificar la función RPC**

En el SQL Editor de Supabase, ejecutar:

```sql
select * from match_alertas(
  array_fill(0, '{1536}')::vector(1536),
  3,
  null
);
```

Expected: 0 filas (no hay embeddings aún) sin error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_rag_embeddings.sql
git commit -m "feat(rag): add pgvector migration with match_alertas RPC"
```

---

## Task 3: lib/embeddings.ts — wrapper OpenAI

**Files:**
- Create: `lib/embeddings.ts`
- Create: `tests/lib/embeddings.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/lib/embeddings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock del SDK de OpenAI antes de importar el módulo bajo prueba
vi.mock('openai', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  }
})

import OpenAI from 'openai'
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings'

describe('buildEmbeddingText', () => {
  it('concatena resumen e impacto con espacio', () => {
    const result = buildEmbeddingText('resumen aquí', 'impacto aquí')
    expect(result).toBe('resumen aquí impacto aquí')
  })

  it('usa solo resumen si impacto es null', () => {
    const result = buildEmbeddingText('solo resumen', null)
    expect(result).toBe('solo resumen')
  })

  it('usa solo resumen si impacto es cadena vacía', () => {
    const result = buildEmbeddingText('solo resumen', '')
    expect(result).toBe('solo resumen')
  })
})

describe('generateEmbedding', () => {
  const fakeEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001)

  beforeEach(() => {
    vi.clearAllMocks()
    ;(OpenAI as any).mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: fakeEmbedding }],
        }),
      },
    }))
  })

  it('devuelve un array de 1536 números', async () => {
    const result = await generateEmbedding('normativa sobre alquiler')
    expect(result).toHaveLength(1536)
    expect(typeof result[0]).toBe('number')
  })

  it('llama a OpenAI con el modelo correcto', async () => {
    const mockInstance = { embeddings: { create: vi.fn().mockResolvedValue({ data: [{ embedding: fakeEmbedding }] }) } }
    ;(OpenAI as any).mockImplementation(() => mockInstance)

    await generateEmbedding('texto de prueba')

    expect(mockInstance.embeddings.create).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'texto de prueba',
    })
  })
})
```

- [ ] **Step 2: Ejecutar el test — verificar que falla**

```bash
cd "C:\Users\alf_c\Documents\Obsidian Vault\IDEAS\RegTrack"
npx vitest run tests/lib/embeddings.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/embeddings'`

- [ ] **Step 3: Crear lib/embeddings.ts**

```typescript
import OpenAI from 'openai'

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/**
 * Construye el texto que se embebe para una alerta.
 * Usa resumen + impacto (más semántico que el título, más corto que texto_alerta).
 */
export function buildEmbeddingText(resumen: string, impacto: string | null): string {
  const parts = [resumen, impacto].filter((p): p is string => Boolean(p))
  return parts.join(' ')
}

/**
 * Genera un embedding de 1536 dimensiones para el texto dado.
 * Usa text-embedding-3-small de OpenAI.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getClient()
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}
```

- [ ] **Step 4: Ejecutar el test — verificar que pasa**

```bash
npx vitest run tests/lib/embeddings.test.ts
```

Expected: PASS — 5 tests pasados.

- [ ] **Step 5: Commit**

```bash
git add lib/embeddings.ts tests/lib/embeddings.test.ts
git commit -m "feat(rag): add embeddings wrapper with OpenAI text-embedding-3-small"
```

---

## Task 4: GET /api/rag/search — búsqueda semántica

**Files:**
- Create: `app/api/rag/search/route.ts`
- Create: `tests/api/rag-search.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/api/rag-search.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(),
}))

import { GET } from '@/app/api/rag/search/route'
import { getAuthUser } from '@/lib/auth'
import { generateEmbedding } from '@/lib/embeddings'
import { createServerClient } from '@/lib/supabase'

const fakeEmbedding = Array.from({ length: 1536 }, () => 0.1)
const fakeAlerta = {
  id: 'abc-123',
  titulo: 'Decreto sobre alquiler',
  resumen: 'Regula contratos de alquiler',
  fuente: 'BOE',
  subtema: 'arrendamiento',
  ambito: 'estatal',
  score_relevancia: 7,
  urgencia: 'alta',
  territorios: [],
  created_at: '2026-01-01T00:00:00Z',
  similarity: 0.92,
}

function makeRequest(q: string) {
  const url = new URL(`http://localhost/api/rag/search?q=${encodeURIComponent(q)}`)
  return { nextUrl: { searchParams: url.searchParams } } as any
}

describe('GET /api/rag/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getAuthUser as any).mockResolvedValue({ id: 'user-1', rol: 'subscriber' })
    ;(generateEmbedding as any).mockResolvedValue(fakeEmbedding)
    ;(createServerClient as any).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [fakeAlerta], error: null }),
    })
  })

  it('devuelve 401 si no hay sesión', async () => {
    ;(getAuthUser as any).mockResolvedValue(null)
    const res = await GET(makeRequest('alquiler'))
    expect(res.status).toBe(401)
  })

  it('devuelve 400 si q es menor de 3 caracteres', async () => {
    const res = await GET(makeRequest('ab'))
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si q supera 200 caracteres', async () => {
    const res = await GET(makeRequest('a'.repeat(201)))
    expect(res.status).toBe(400)
  })

  it('devuelve resultados con similarity cuando la query es válida', async () => {
    const res = await GET(makeRequest('normativa sobre alquiler'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(1)
    expect(body.results[0].similarity).toBe(0.92)
  })

  it('llama a generateEmbedding con la query exacta', async () => {
    await GET(makeRequest('arrendamiento urbano'))
    expect(generateEmbedding).toHaveBeenCalledWith('arrendamiento urbano')
  })
})
```

- [ ] **Step 2: Ejecutar el test — verificar que falla**

```bash
npx vitest run tests/api/rag-search.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/rag/search/route'`

- [ ] **Step 3: Crear el route handler**

Crear `app/api/rag/search/route.ts`:

```typescript
import { type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { generateEmbedding } from '@/lib/embeddings'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // 1. Autenticación
  const user = await getAuthUser()
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Validar query
  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 3) {
    return Response.json({ error: 'La búsqueda debe tener al menos 3 caracteres' }, { status: 400 })
  }
  if (q.length > 200) {
    return Response.json({ error: 'La búsqueda no puede superar 200 caracteres' }, { status: 400 })
  }

  // 3. Generar embedding de la query
  let embedding: number[]
  try {
    embedding = await generateEmbedding(q)
  } catch {
    return Response.json({ error: 'Error al procesar la búsqueda. Inténtalo de nuevo.' }, { status: 503 })
  }

  // 4. Búsqueda semántica en Supabase
  const db = createServerClient()
  const { data, error } = await db.rpc('match_alertas', {
    query_embedding: embedding,
    match_count: 8,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ results: data ?? [] })
}
```

- [ ] **Step 4: Ejecutar el test — verificar que pasa**

```bash
npx vitest run tests/api/rag-search.test.ts
```

Expected: PASS — 5 tests pasados.

- [ ] **Step 5: Commit**

```bash
git add app/api/rag/search/route.ts tests/api/rag-search.test.ts
git commit -m "feat(rag): add GET /api/rag/search semantic search handler"
```

---

## Task 5: POST /api/rag/chat — síntesis conversacional con streaming

**Files:**
- Create: `app/api/rag/chat/route.ts`
- Create: `tests/api/rag-chat.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/api/rag-chat.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }))
vi.mock('@/lib/embeddings', () => ({ generateEmbedding: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createServerClient: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: vi.fn() },
  })),
}))

import { POST } from '@/app/api/rag/chat/route'
import { getAuthUser } from '@/lib/auth'
import { generateEmbedding } from '@/lib/embeddings'
import { createServerClient } from '@/lib/supabase'

const fakeEmbedding = Array.from({ length: 1536 }, () => 0.1)
const fakeAlerta = {
  id: 'abc-123', titulo: 'Decreto alquiler', resumen: 'Resumen',
  fuente: 'BOE', subtema: 'arrendamiento', ambito: 'estatal',
  score_relevancia: 7, urgencia: 'alta', territorios: [],
  created_at: '2026-01-01T00:00:00Z', similarity: 0.9,
}

function makeRequest(body: object) {
  return { json: () => Promise.resolve(body) } as any
}

describe('POST /api/rag/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getAuthUser as any).mockResolvedValue({ id: 'user-1' })
    ;(generateEmbedding as any).mockResolvedValue(fakeEmbedding)
    ;(createServerClient as any).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [fakeAlerta], error: null }),
    })
  })

  it('devuelve 401 si no hay sesión', async () => {
    ;(getAuthUser as any).mockResolvedValue(null)
    const res = await POST(makeRequest({ query: 'alquiler', history: [] }))
    expect(res.status).toBe(401)
  })

  it('devuelve 400 si falta query', async () => {
    const res = await POST(makeRequest({ history: [] }))
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si query está vacía', async () => {
    const res = await POST(makeRequest({ query: '', history: [] }))
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si history no es array', async () => {
    const res = await POST(makeRequest({ query: 'alquiler', history: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('llama a generateEmbedding con la query', async () => {
    // Para este test, mockear stream para que no bloquee
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    ;(Anthropic as any).mockImplementation(() => ({
      messages: {
        stream: vi.fn().mockReturnValue((async function* () {})()),
      },
    }))
    await POST(makeRequest({ query: '¿qué hay de arrendamiento?', history: [] }))
    expect(generateEmbedding).toHaveBeenCalledWith('¿qué hay de arrendamiento?')
  })
})
```

- [ ] **Step 2: Ejecutar el test — verificar que falla**

```bash
npx vitest run tests/api/rag-chat.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/rag/chat/route'`

- [ ] **Step 3: Crear el route handler con streaming SSE**

Crear `app/api/rag/chat/route.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '@/lib/auth'
import { generateEmbedding } from '@/lib/embeddings'
import { createServerClient } from '@/lib/supabase'

const SYSTEM_PROMPT = `Eres el asistente de RegTrack, especializado en normativa inmobiliaria española.
Responde SOLO con información de las alertas normativas proporcionadas como contexto.
Cita siempre la fuente (BOE, BOCM, DOGC…) y la fecha de publicación cuando estén disponibles.
Si no tienes información suficiente en el contexto, dilo claramente sin inventar datos.
Responde siempre en español. Sé conciso y directo. Usa negritas para términos clave.`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AlertaResult {
  id: string
  titulo: string
  resumen: string
  fuente: string
  subtema: string
  ambito: string
  score_relevancia: number
  urgencia: string
  territorios: unknown
  created_at: string
  similarity: number
}

function buildContext(alertas: AlertaResult[]): string {
  if (alertas.length === 0) {
    return 'No hay alertas normativas relevantes para esta consulta en la base de datos.'
  }
  return alertas
    .map((a, i) => {
      const fecha = new Date(a.created_at).toLocaleDateString('es-ES')
      return `[${i + 1}] ${a.fuente} — ${a.titulo} (${fecha})\n${a.resumen}`
    })
    .join('\n\n')
}

export async function POST(request: Request) {
  // 1. Autenticación
  const user = await getAuthUser()
  if (!user) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Parsear y validar body
  let body: { query?: unknown; history?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { query, history } = body

  if (typeof query !== 'string' || query.trim().length === 0) {
    return Response.json({ error: 'El campo query es obligatorio' }, { status: 400 })
  }
  if (!Array.isArray(history)) {
    return Response.json({ error: 'El campo history debe ser un array' }, { status: 400 })
  }

  // Limitar historial a 6 turnos (12 mensajes)
  const trimmedHistory = (history as Message[]).slice(-12)

  // 3. Embed query + recuperar alertas relevantes
  let embedding: number[]
  try {
    embedding = await generateEmbedding(query)
  } catch {
    return Response.json({ error: 'Error al procesar la consulta. Inténtalo de nuevo.' }, { status: 503 })
  }

  const db = createServerClient()
  const { data: alertas, error: dbError } = await db.rpc('match_alertas', {
    query_embedding: embedding,
    match_count: 6,
  }) as { data: AlertaResult[] | null; error: unknown }

  if (dbError) {
    return Response.json({ error: 'Error al buscar normativa' }, { status: 500 })
  }

  const matchedAlertas = alertas ?? []
  const context = buildContext(matchedAlertas)
  const systemWithContext = `${SYSTEM_PROMPT}\n\n## Alertas normativas de contexto\n\n${context}`

  // 4. Streaming SSE con Claude Haiku
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const claudeStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5',
          max_tokens: 600,
          system: systemWithContext,
          messages: [
            ...trimmedHistory,
            { role: 'user', content: query },
          ],
        })

        for await (const chunk of claudeStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const event = JSON.stringify({ type: 'text', text: chunk.delta.text })
            controller.enqueue(encoder.encode(`data: ${event}\n\n`))
          }
        }

        // Evento final con fuentes
        const sourcesEvent = JSON.stringify({
          type: 'sources',
          sources: matchedAlertas.map(a => ({
            id: a.id,
            titulo: a.titulo,
            fuente: a.fuente,
            similarity: a.similarity,
          })),
        })
        controller.enqueue(encoder.encode(`data: ${sourcesEvent}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        const errorEvent = JSON.stringify({ type: 'error', message: 'Error al generar respuesta' })
        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 4: Ejecutar el test — verificar que pasa**

```bash
npx vitest run tests/api/rag-chat.test.ts
```

Expected: PASS — 5 tests pasados.

- [ ] **Step 5: Commit**

```bash
git add app/api/rag/chat/route.ts tests/api/rag-chat.test.ts
git commit -m "feat(rag): add POST /api/rag/chat streaming SSE handler with Claude Haiku"
```

---

## Task 6: Script de backfill de embeddings

**Files:**
- Create: `scripts/backfill-embeddings.ts`

- [ ] **Step 1: Crear el script**

Crear `scripts/backfill-embeddings.ts`:

```typescript
import { readFileSync } from 'fs'
import { join } from 'path'

// Cargar .env.local (mismo patrón que pipeline.ts)
;(function loadLocalEnv() {
  try {
    const content = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
  } catch { /* sin .env.local, ignorar */ }
})()

import { createServerClient } from '@/lib/supabase'
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings'

const BATCH_SIZE = 50
const DELAY_MS = 200

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  const db = createServerClient()

  console.log('[backfill] Buscando alertas sin embedding...')
  const { data: alertas, error } = await db
    .from('alertas')
    .select('id, resumen, impacto')
    .is('embedding', null)
    .in('estado', ['aprobada', 'enviada'])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[backfill] Error al consultar alertas:', error.message)
    process.exit(1)
  }

  const total = alertas?.length ?? 0
  console.log(`[backfill] ${total} alertas sin embedding`)

  if (total === 0) {
    console.log('[backfill] Nada que procesar. Saliendo.')
    return
  }

  let procesadas = 0
  let errores = 0

  for (let i = 0; i < alertas!.length; i += BATCH_SIZE) {
    const batch = alertas!.slice(i, i + BATCH_SIZE)
    console.log(`[backfill] Procesando lote ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} alertas)...`)

    for (const alerta of batch) {
      try {
        const text = buildEmbeddingText(alerta.resumen ?? '', alerta.impacto ?? null)
        if (!text.trim()) {
          console.log(`[backfill] Saltando ${alerta.id} — texto vacío`)
          continue
        }

        const embedding = await generateEmbedding(text)

        const { error: updateError } = await db
          .from('alertas')
          .update({ embedding })
          .eq('id', alerta.id)

        if (updateError) {
          console.error(`[backfill] Error al actualizar ${alerta.id}:`, updateError.message)
          errores++
        } else {
          procesadas++
          console.log(`[backfill] ${procesadas}/${total} — ${alerta.id}`)
        }
      } catch (err) {
        console.error(`[backfill] Error en ${alerta.id}:`, err)
        errores++
      }
    }

    if (i + BATCH_SIZE < alertas!.length) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`[backfill] Completado. Procesadas: ${procesadas}, Errores: ${errores}`)
}

run().catch(err => {
  console.error('[backfill] Error fatal:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Ejecutar el backfill**

```bash
cd "C:\Users\alf_c\Documents\Obsidian Vault\IDEAS\RegTrack"
npx tsx scripts/backfill-embeddings.ts
```

Expected: logs mostrando alertas procesadas, sin errores fatales.

- [ ] **Step 3: Verificar en Supabase**

En el SQL Editor ejecutar:

```sql
select count(*) from alertas where embedding is not null;
```

Expected: número > 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-embeddings.ts
git commit -m "feat(rag): add backfill script for existing alerts embeddings"
```

---

## Task 7: Integrar generateEmbedding en el pipeline

**Files:**
- Modify: `actions/pipeline.ts` (líneas ~209-215, tras clasificarSectorial)

- [ ] **Step 1: Añadir el import de generateEmbedding y buildEmbeddingText**

En `actions/pipeline.ts`, añadir a los imports existentes (junto a los otros imports de `@/lib/`):

```typescript
import { generateEmbedding, buildEmbeddingText } from '@/lib/embeddings'
```

Colocarlo después de la línea:
```typescript
import { clasificarSectorial } from '@/lib/sectorial/clasificar'
```

- [ ] **Step 2: Añadir el paso de embedding tras clasificarSectorial**

En `actions/pipeline.ts`, localizar el bloque de clasificarSectorial (líneas ~209-215):

```typescript
      // 8.5. Clasificación sectorial (no bloquea el pipeline si falla)
      await new Promise(r => setTimeout(r, 1500))
      try {
        await clasificarSectorial(saved.id, alertaBase.titulo, alertaBase.resumen ?? null)
      } catch (sectErr) {
        console.error(`[pipeline] Error en clasificación sectorial (no bloqueante):`, sectErr)
      }
```

Reemplazarlo con:

```typescript
      // 8.5. Clasificación sectorial (no bloquea el pipeline si falla)
      await new Promise(r => setTimeout(r, 1500))
      try {
        await clasificarSectorial(saved.id, alertaBase.titulo, alertaBase.resumen ?? null)
      } catch (sectErr) {
        console.error(`[pipeline] Error en clasificación sectorial (no bloqueante):`, sectErr)
      }

      // 8.6. Generar embedding para búsqueda semántica (no bloquea el pipeline si falla)
      try {
        const embeddingText = buildEmbeddingText(
          alertaBase.resumen ?? '',
          alertaBase.impacto ?? null,
        )
        if (embeddingText.trim()) {
          const embedding = await generateEmbedding(embeddingText)
          await db.from('alertas').update({ embedding }).eq('id', saved.id)
          console.log(`[pipeline] Embedding generado para ${saved.id}`)
        }
      } catch (embErr) {
        console.error(`[pipeline] Error al generar embedding (no bloqueante):`, embErr)
      }
```

- [ ] **Step 3: Verificar que TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add actions/pipeline.ts
git commit -m "feat(rag): add embedding generation step to ingestion pipeline"
```

---

## Task 8: Tipos compartidos y componentes UI hoja

**Files:**
- Create: `components/rag/types.ts`
- Create: `components/rag/RagMessage.tsx`
- Create: `components/rag/RagSourceCard.tsx`
- Create: `components/rag/RagEmptyState.tsx`
- Create: `components/rag/RagSearchBar.tsx`

- [ ] **Step 1: Crear types.ts**

```typescript
// components/rag/types.ts

export type WidgetState = 'closed' | 'open'

export interface RagMessage {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export interface AlertaSource {
  id: string
  titulo: string
  fuente: string
  similarity: number
}

export interface AlertaResult {
  id: string
  titulo: string
  resumen: string
  fuente: string
  subtema: string
  ambito: string
  score_relevancia: number
  urgencia: string
  territorios: unknown
  created_at: string
  similarity: number
}
```

- [ ] **Step 2: Crear RagMessage.tsx**

```tsx
// components/rag/RagMessage.tsx
'use client'

import type { RagMessage } from './types'

interface Props {
  message: RagMessage
}

export function RagMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-900 rounded-bl-sm'
        }`}
      >
        <span
          dangerouslySetInnerHTML={{ __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
        />
        {message.isStreaming && (
          <span className="inline-block w-1 h-3.5 ml-0.5 bg-current animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crear RagSourceCard.tsx**

```tsx
// components/rag/RagSourceCard.tsx
'use client'

import type { AlertaSource } from './types'

interface Props {
  source: AlertaSource
}

const FUENTE_COLORS: Record<string, string> = {
  BOE: 'bg-blue-100 text-blue-800',
  BOCM: 'bg-purple-100 text-purple-800',
  DOGC: 'bg-green-100 text-green-800',
  DEFAULT: 'bg-slate-100 text-slate-700',
}

export function RagSourceCard({ source }: Props) {
  const colorClass = FUENTE_COLORS[source.fuente] ?? FUENTE_COLORS.DEFAULT
  const pct = Math.round(source.similarity * 100)

  return (
    <a
      href={`/alerta/${source.id}`}
      className="block rounded-lg border border-slate-200 p-2.5 hover:border-blue-300 hover:bg-blue-50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${colorClass}`}>
          {source.fuente}
        </span>
        <span className="text-xs text-slate-400">{pct}% relevante</span>
      </div>
      <p className="text-xs text-slate-700 line-clamp-2 leading-snug">{source.titulo}</p>
    </a>
  )
}
```

- [ ] **Step 4: Crear RagEmptyState.tsx**

```tsx
// components/rag/RagEmptyState.tsx
'use client'

const SUGGESTIONS = [
  '¿Qué novedades hay en arrendamiento urbano este mes?',
  'Normativa reciente sobre obra nueva en Cataluña',
  'Cambios en comunidades de propietarios 2026',
]

interface Props {
  onSuggestion: (text: string) => void
}

export function RagEmptyState({ onSuggestion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-900 mb-1">Busca normativa</p>
      <p className="text-xs text-slate-500 mb-4">
        Pregunta sobre regulación inmobiliaria o busca alertas por tema
      </p>
      <div className="w-full space-y-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="w-full text-left text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Crear RagSearchBar.tsx**

```tsx
// components/rag/RagSearchBar.tsx
'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onSubmit: (query: string) => void
  isLoading?: boolean
  placeholder?: string
  autoFocus?: boolean
}

export function RagSearchBar({ onSubmit, isLoading = false, placeholder = 'Pregunta o busca normativa…', autoFocus = false }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <div className="flex items-end gap-2 p-3 border-t border-slate-200 bg-white">
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-28 overflow-y-auto"
        style={{ height: 'auto' }}
        onInput={e => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = `${Math.min(el.scrollHeight, 112)}px`
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isLoading}
        className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Enviar"
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add components/rag/
git commit -m "feat(rag): add shared types and leaf UI components"
```

---

## Task 9: RagTrigger + RagPanel

**Files:**
- Create: `components/rag/RagTrigger.tsx`
- Create: `components/rag/RagPanel.tsx`

- [ ] **Step 1: Crear RagTrigger.tsx**

```tsx
// components/rag/RagTrigger.tsx
'use client'

interface Props {
  onClick: () => void
}

export function RagTrigger({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Buscar normativa"
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>
  )
}
```

- [ ] **Step 2: Crear RagPanel.tsx**

```tsx
// components/rag/RagPanel.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import type { RagMessage, AlertaSource } from './types'
import { RagMessage as RagMessageBubble } from './RagMessage'
import { RagSourceCard } from './RagSourceCard'
import { RagEmptyState } from './RagEmptyState'
import { RagSearchBar } from './RagSearchBar'

interface Props {
  messages: RagMessage[]
  sources: AlertaSource[]
  isLoading: boolean
  onQuery: (query: string) => void
  onClose: () => void
}

export function RagPanel({ messages, sources, isLoading, onQuery, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Cerrar con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed bottom-20 right-6 z-50 w-[420px] max-md:w-[calc(100vw-2rem)] max-md:right-4 h-[560px] max-md:h-[70dvh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="text-sm font-semibold text-slate-900">RegTrack IA</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Contenido principal */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <RagEmptyState onSuggestion={onQuery} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <RagMessageBubble key={i} message={msg} />
            ))}
          </>
        )}
      </div>

      {/* Fuentes colapsables (solo en modo chat cuando hay fuentes) */}
      {mode === 'chat' && sources.length > 0 && (
        <div className="border-t border-slate-100 shrink-0">
          <button
            onClick={() => setSourcesOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>Fuentes consultadas ({sources.length})</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sourcesOpen && (
            <div className="px-3 pb-2 space-y-1.5 max-h-36 overflow-y-auto">
              {sources.map(s => (
                <RagSourceCard key={s.id} source={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barra de input */}
      <RagSearchBar
        onSubmit={onQuery}
        isLoading={isLoading}
        autoFocus
      />
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/rag/RagTrigger.tsx components/rag/RagPanel.tsx
git commit -m "feat(rag): add RagTrigger and RagPanel components"
```

---

## Task 10: RagWidget — orquestador principal

**Files:**
- Create: `components/rag/RagWidget.tsx`

- [ ] **Step 1: Crear RagWidget.tsx**

```tsx
// components/rag/RagWidget.tsx
'use client'

import { useState, useCallback } from 'react'
import type { WidgetState, RagMessage, AlertaSource } from './types'
import { RagTrigger } from './RagTrigger'
import { RagPanel } from './RagPanel'

export function RagWidget() {
  const [widgetState, setWidgetState] = useState<WidgetState>('closed')
  const [messages, setMessages] = useState<RagMessage[]>([])
  const [sources, setSources] = useState<AlertaSource[]>([])
  const [isLoading, setIsLoading] = useState(false)

  function open() {
    setWidgetState('open')
  }

  function close() {
    setWidgetState('closed')
    // Limpiar estado al cerrar
    setMessages([])
    setSources([])
  }

  const handleQuery = useCallback(async (query: string) => {
    if (isLoading) return

    setWidgetState('open')
    setIsLoading(true)

    // Añadir mensaje del usuario
    const userMsg: RagMessage = { role: 'user', content: query }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    // Placeholder de respuesta con streaming
    const assistantMsg: RagMessage = { role: 'assistant', content: '', isStreaming: true }
    setMessages([...newMessages, assistantMsg])

    try {
      const history = newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const event = JSON.parse(data)
            if (event.type === 'text') {
              fullText += event.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: fullText, isStreaming: true }
                return updated
              })
            } else if (event.type === 'sources') {
              setSources(event.sources)
            } else if (event.type === 'error') {
              fullText = 'Lo siento, ha ocurrido un error al generar la respuesta.'
            }
          } catch { /* JSON malformado, ignorar */ }
        }
      }

      // Finalizar streaming
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: fullText || 'Sin respuesta.', isStreaming: false }
        return updated
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Lo siento, no he podido conectar con el servidor. Inténtalo de nuevo.',
          isStreaming: false,
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  if (widgetState === 'closed') {
    return <RagTrigger onClick={open} />
  }

  return (
    <>
      <RagTrigger onClick={close} />
      <RagPanel
        messages={messages}
        sources={sources}
        isLoading={isLoading}
        onQuery={handleQuery}
        onClose={close}
      />
    </>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add components/rag/RagWidget.tsx
git commit -m "feat(rag): add RagWidget orchestrator with streaming chat state"
```

---

## Task 11: Montar el widget en el subscriber layout

**Files:**
- Modify: `app/(subscriber)/layout.tsx`

- [ ] **Step 1: Añadir RagWidget al layout**

Abrir `app/(subscriber)/layout.tsx`. El archivo actualmente contiene:

```typescript
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { SubscriberSidebar } from '@/app/components/layouts/SubscriberSidebar'
import { MobileNav } from '@/app/components/layouts/MobileNav'

export default async function SubscriberLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden md:flex">
        <SubscriberSidebar nombre={user.nombre} plan={user.plan} />
      </div>
      <main className="flex-1 overflow-auto">
        <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
          <MobileNav sidebar={<SubscriberSidebar nombre={user.nombre} plan={user.plan} />} />
          <span className="font-bold text-sm text-slate-900">RegTrack</span>
        </div>
        {children}
      </main>
    </div>
  )
}
```

Reemplazarlo con:

```typescript
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { SubscriberSidebar } from '@/app/components/layouts/SubscriberSidebar'
import { MobileNav } from '@/app/components/layouts/MobileNav'
import { RagWidget } from '@/components/rag/RagWidget'

export default async function SubscriberLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()

  if (!user) redirect('/login')
  // DEV: admin puede acceder a vista suscriptor temporalmente
  // if (user.rol !== 'subscriber') redirect('/admin/dashboard')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden md:flex">
        <SubscriberSidebar nombre={user.nombre} plan={user.plan} />
      </div>
      <main className="flex-1 overflow-auto">
        <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
          <MobileNav sidebar={<SubscriberSidebar nombre={user.nombre} plan={user.plan} />} />
          <span className="font-bold text-sm text-slate-900">RegTrack</span>
        </div>
        {children}
      </main>
      <RagWidget />
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Arrancar el servidor de desarrollo y verificar visualmente**

```bash
npm run dev
```

Abrir http://localhost:3000 en el portal suscriptor. Verificar:
- ✅ Botón azul redondo visible en esquina inferior derecha
- ✅ Click abre el panel con empty state y sugerencias
- ✅ Click en una sugerencia envía la consulta
- ✅ La respuesta aparece en streaming (tokens aparecen progresivamente)
- ✅ Al terminar aparece la sección "Fuentes consultadas"
- ✅ Las cards de fuentes enlazan correctamente a /alerta/[id]
- ✅ Esc cierra el panel
- ✅ En mobile el panel ocupa el ancho completo

- [ ] **Step 4: Ejecutar todos los tests**

```bash
npx vitest run
```

Expected: todos los tests pasan sin errores.

- [ ] **Step 5: Commit final**

```bash
git add app/(subscriber)/layout.tsx
git commit -m "feat(rag): mount RagWidget in subscriber layout — RAG feature complete"
```

---

## Checklist de verificación post-implementación

- [ ] `npx vitest run` — todos los tests pasan
- [ ] `npx tsc --noEmit` — sin errores de tipos
- [ ] Widget visible y funcional en http://localhost:3000 (portal suscriptor)
- [ ] La migración 007 está aplicada en Supabase
- [ ] El backfill ha procesado las alertas existentes (`select count(*) from alertas where embedding is not null` > 0)
- [ ] El pipeline procesa nuevas alertas con embedding (verificar en próxima ejecución manual)
- [ ] Deploy en Vercel: añadir `OPENAI_API_KEY` a las variables de entorno del proyecto
