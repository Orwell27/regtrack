#!/usr/bin/env bash
set -euo pipefail
repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
generated="$repo_root/.knowledge/local-services"
state=/opt/regtrack/services
mkdir -p "$repo_root/artifacts/local-services"
if test "$#" -gt 1 || { test "$#" -eq 1 && test "$1" != '--skip-migration'; }; then
  echo 'Uso: start-openaleph.sh [--skip-migration]'; exit 1
fi
install -d -m 700 "$state"
if test -e "$state/.env"; then
  cmp --silent "$generated/.env" "$state/.env" || { echo 'Credenciales distintas; conservar el estado existente y revisar'; exit 1; }
else
  install -m 600 "$generated/.env" "$state/.env"
fi
install -m 600 "$generated/compose.openaleph.json" "$state/compose.openaleph.json"
install -m 600 "$generated/compose.graphiti.json" "$state/compose.graphiti.json"
dc=(docker compose --env-file "$state/.env" -f "$state/compose.openaleph.json")
"${dc[@]}" config --quiet
"${dc[@]}" up -d --wait --wait-timeout 360 postgres elasticsearch redis
if test "${1:-}" != '--skip-migration'; then
  "${dc[@]}" --profile setup run --rm migrate > "$repo_root/artifacts/local-services/openaleph-migrate.log" 2>&1
fi
"${dc[@]}" up -d api worker
"${dc[@]}" run --rm -T --no-deps -v "$repo_root/integrations/local/bootstrap-user.py:/tmp/regtrack-bootstrap.py:ro" api python /tmp/regtrack-bootstrap.py \
  > "$generated/openaleph-identity.json" 2> "$repo_root/artifacts/local-services/openaleph-bootstrap.log"
install -m 600 "$generated/openaleph-identity.json" "$state/openaleph-identity.json"
echo 'OpenAleph arrancado. Clave local guardada sin mostrar; pendiente prueba de importación.'
