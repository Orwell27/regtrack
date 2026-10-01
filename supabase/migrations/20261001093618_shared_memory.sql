-- Shared archive, accessed only by the worker and the authenticated admin server reader.
-- No policy grants direct access to browser users. A capture is insert-only.
create table public.regtrack_memory_records (
  key text primary key check (key ~ '^[a-f0-9]{32}-[a-f0-9]{32}$'),
  record jsonb not null,
  markdown text not null,
  stored_at timestamptz not null default now(),
  constraint memory_record_shape check (coalesce(
    jsonb_typeof(record) = 'object'
    and record->'schemaVersion' = '1'::jsonb
    and key = (record->>'id') || '-' || (record->>'version')
    and record->>'review' = 'pendiente'
    and record->>'legalStatus' = 'sin_verificar'
    and record->>'contentHash' ~ '^[a-f0-9]{64}$'
    and record->>'kind' in ('norma', 'noticia', 'cambio_web', 'analisis', 'reporte')
    and jsonb_typeof(record->'content') = 'string', false)),
  constraint memory_record_size check (octet_length(record::text) + octet_length(markdown) <= 4194304)
);
alter table public.regtrack_memory_records enable row level security;
alter table public.regtrack_memory_records force row level security;
revoke all on public.regtrack_memory_records from public, anon, authenticated, service_role;
grant select, insert on public.regtrack_memory_records to service_role;
comment on table public.regtrack_memory_records is 'Versioned RegTrack memory. Server-only, insert-only; not a legal validation or a full infrastructure backup.';
