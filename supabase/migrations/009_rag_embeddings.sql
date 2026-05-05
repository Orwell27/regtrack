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
