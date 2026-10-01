#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image='docker.io/library/postgres@sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f'
container="regtrack-memory-sql-$$"
cleanup() { docker stop "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --rm --name "$container" --network none --memory 256m --shm-size 64m \
  --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=memory_test "$image" >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres -d memory_test >/dev/null 2>&1; then break; fi
  sleep 1
done
sql() { docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d memory_test; }
sql <<'SQL'
create role anon;
create role authenticated;
create role service_role bypassrls;
SQL
sql < supabase/migrations/20261001093618_shared_memory.sql
sql < scripts/check-memory-db.sql
echo 'Memoria SQL: acceso público denegado; inserción, lectura, reintento e inmutabilidad comprobados.'
