# RAG Widget — Diseño Técnico
**Fecha:** 2026-05-02
**Estado:** Aprobado

## Resumen

Widget flotante de búsqueda semántica y asistente conversacional para el portal suscriptor de RegTrack. Permite a cualquier suscriptor consultar en lenguaje natural el corpus de alertas normativas acumuladas (estado `aprobada` o `enviada`), obteniendo tanto resultados semánticos rankeados como respuestas sintetizadas por Claude Haiku con citas a las fuentes.

---

## Decisiones de diseño

| Pregunta | Decisión |
|----------|----------|
| Modelo de interacción | Híbrido: buscador semántico + asistente conversacional |
| Ubicación en UI | Widget flotante disponible en todo el portal suscriptor |
| Acceso por plan | Todos los suscriptores (sin restricción) |
| Corpus | Todas las alertas con estado `aprobada` o `enviada` |
| Conversación | Multi-turn, historial efímero (máx. 6 turnos, no persiste en DB) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Búsqueda vectorial | Supabase pgvector con índice HNSW |
| Síntesis | Claude Haiku con streaming SSE |

---

## Arquitectura general

```
Suscriptor
    │
    ▼
[Widget flotante] ← montado en app/(subscriber)/layout.tsx
    │
    ├─ búsqueda semántica ──► GET /api/rag/search?q=...
    │                              │
    └─ conversación ───────► POST /api/rag/chat
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
          [OpenAI Embeddings]          [Supabase pgvector]
          text-embedding-3-small        match_alertas() RPC
                    │                             │
                    └──────── top-K alertas ──────┘
                                   │
                          [Claude Haiku]
                     sintetiza respuesta con citas
                                   │
                          respuesta + fuentes
                              al widget
```

---

## Capa de datos

### Migración `007_rag_embeddings.sql`

```sql
create extension if not exists vector;

alter table alertas
  add column embedding vector(1536);

create index alertas_embedding_idx
  on alertas using hnsw (embedding vector_cosine_ops);

create or replace function match_alertas(
  query_embedding vector(1536),
  match_count     int default 8,
  filter_estado   text default null
)
returns table (
  id              uuid,
  titulo          text,
  resumen         text,
  fuente          text,
  subtema         text,
  ambito          text,
  score_relevancia int,
  urgencia        text,
  territorios     jsonb,
  created_at      timestamptz,
  similarity      float
)
language sql stable as $$
  select
    id, titulo, resumen, fuente::text, subtema::text,
    ambito::text, score_relevancia, urgencia::text,
    territorios, created_at,
    1 - (embedding <=> query_embedding) as similarity
  from alertas
  where
    embedding is not null
    and (filter_estado is null or estado::text = filter_estado)
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### Texto para embedding

Se embebe `resumen || ' ' || impacto` de cada alerta. Es semánticamente más denso que el título y más corto que `texto_alerta`, optimizando calidad de retrieval y coste.

### Backfill

Script `scripts/backfill-embeddings.ts`:
- Procesa alertas sin embedding en lotes de 50
- Delay de 200ms entre lotes (rate limits OpenAI)
- Ejecución única manual tras desplegar la migración

### Nuevas alertas en el pipeline

En `actions/pipeline.ts`, tras el paso de `analyzeImpact()` (Sonnet), se añade `generateEmbedding()`:
- Llama a OpenAI y guarda el vector en Supabase
- Fallo no es bloqueante: la alerta se inserta sin embedding y el backfill la recoge en la próxima ejecución

---

## Capa de API

### `GET /api/rag/search`

Parámetros: `q` (string, 3–200 chars)

Flujo:
1. `getAuthUser()` → 401 si no autenticado
2. Validar `q`
3. `openai.embeddings.create({ model: 'text-embedding-3-small', input: q })`
4. `supabase.rpc('match_alertas', { query_embedding, match_count: 8 })`
5. Devolver `{ results: AlertaResult[] }`

### `POST /api/rag/chat`

Body:
```typescript
{
  query:   string      // último mensaje del usuario
  history: Message[]  // hasta 6 turnos previos [{ role, content }]
}
```

Flujo:
1. `getAuthUser()` → 401
2. Validar body con zod
3. Embed `query` → `match_alertas(embedding, match_count: 6)`
4. Construir system prompt:
   > "Eres el asistente de RegTrack. Responde SOLO con información de las siguientes alertas normativas españolas. Cita siempre la fuente (BOE, BOCM…) y la fecha. Si no tienes información suficiente, dilo claramente. Responde en español."
   Seguido del contexto de las alertas recuperadas.
5. Llamar Claude Haiku con `stream: true`, `max_tokens: 600`
6. Devolver respuesta como SSE stream
7. Al finalizar el stream, emitir evento `sources` con las alertas contextuales

**Manejo de errores:**
- OpenAI timeout (>5s) → 503 con mensaje claro
- Sin resultados en pgvector → Claude responde que no tiene normativa relevante sobre ese tema
- Rate limiting: no se añade (volumen esperado bajo)

---

## Capa de UI

### Estructura de componentes

```
app/(subscriber)/layout.tsx
  └── <RagWidget />

components/rag/
  ├── RagWidget.tsx       — orquestador: estado abierto/cerrado, historial
  ├── RagTrigger.tsx      — botón flotante (bottom-right)
  ├── RagPanel.tsx        — panel expandido con chat + resultados
  ├── RagSearchBar.tsx    — input + botón buscar/enviar
  ├── RagMessage.tsx      — burbuja de mensaje (user | assistant)
  ├── RagSourceCard.tsx   — card compacta de alerta fuente con link
  └── RagEmptyState.tsx   — estado inicial con sugerencias de consulta
```

### Estados del widget

```
[cerrado]
  ↓ click en RagTrigger
[abierto - búsqueda]   input + resultados semánticos (cards)
  ↓ usuario envía pregunta
[abierto - chat]        historial + streaming + sección "Fuentes"
  ↓ X o Esc
[cerrado]
```

### Especificaciones de UX

- **Posición:** `fixed bottom-6 right-6`, z-index sobre el contenido
- **Tamaño desktop:** `w-[420px] h-[560px]`
- **Tamaño mobile:** `w-full h-[70dvh]`, slide-up desde abajo
- **Streaming:** tokens de Claude aparecen progresivamente con cursor parpadeante
- **Fuentes:** al finalizar el stream, sección colapsable "Fuentes consultadas" con `RagSourceCard` enlazadas a `/alerta/[id]`
- **Sugerencias iniciales** en el empty state:
  - "¿Qué novedades hay en arrendamiento urbano este mes?"
  - "Normativa reciente sobre obra nueva en Cataluña"
  - "Cambios en comunidades de propietarios 2026"
- **Historial:** efímero, se limpia al cerrar. No se persiste en DB.
- **Formato de respuesta:** prosa con negritas ocasionales. Sin tablas ni listas complejas.

---

## Nuevas dependencias

| Paquete | Uso |
|---------|-----|
| `openai` | Generación de embeddings (`text-embedding-3-small`) |

Variable de entorno nueva: `OPENAI_API_KEY`

Las dependencias de Anthropic SDK y Supabase ya están presentes.

---

## Coste estimado

| Operación | Modelo | Coste aprox. |
|-----------|--------|--------------|
| Backfill embeddings (~500 alertas) | text-embedding-3-small | < $0.01 |
| Embedding por consulta | text-embedding-3-small | $0.00002 |
| Síntesis por consulta (600 tokens) | Claude Haiku | ~$0.001 |

Coste por consulta: **< $0.002**. Negligible para el volumen actual.

---

## Archivos a crear / modificar

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/007_rag_embeddings.sql` | Crear |
| `scripts/backfill-embeddings.ts` | Crear |
| `lib/embeddings.ts` | Crear — wrapper OpenAI embeddings |
| `app/api/rag/search/route.ts` | Crear |
| `app/api/rag/chat/route.ts` | Crear |
| `components/rag/RagWidget.tsx` | Crear |
| `components/rag/RagTrigger.tsx` | Crear |
| `components/rag/RagPanel.tsx` | Crear |
| `components/rag/RagSearchBar.tsx` | Crear |
| `components/rag/RagMessage.tsx` | Crear |
| `components/rag/RagSourceCard.tsx` | Crear |
| `components/rag/RagEmptyState.tsx` | Crear |
| `app/(subscriber)/layout.tsx` | Modificar — montar `<RagWidget />` |
| `actions/pipeline.ts` | Modificar — añadir paso `generateEmbedding()` |
