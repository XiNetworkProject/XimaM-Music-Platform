#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${1:-$(pwd)}"
PG_BIN="${PHASE1B_PG_BIN:-/usr/lib/postgresql/17/bin}"
PG_PORT="${PHASE1B_PGPORT:-5433}"
DB_NAME="${PHASE1B_DATABASE:-postgres}"
BASELINE_VERSION="20260907000000"

case "$ROOT_DIR" in
  /*) ;;
  *) echo "ROOT_DIR doit etre absolu" >&2; exit 2 ;;
esac
[[ "$DB_NAME" =~ ^[a-zA-Z0-9_]+$ ]] || { echo "Nom de base invalide" >&2; exit 2; }
if [[ "${PHASE1B_PRODUCTION:-0}" == "1" && "${SYNAURA_MIGRATION_BACKUP_CONFIRMED:-0}" != "1" ]]; then
  echo "Production refusee: sauvegarde non confirmee" >&2
  exit 2
fi

psql=("$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --set ON_ERROR_STOP=1)
baseline_checksum="$(cat \
  "$ROOT_DIR/database/baseline/000_prerequisite_roles.sql" \
  "$ROOT_DIR/database/baseline/010_production_schema.sql" | sha256sum | cut -d' ' -f1)"

tracking="$("${psql[@]}" --tuples-only --no-align \
  --command "SELECT to_regclass('synaura_private.schema_migrations') IS NOT NULL")"
if [[ "$tracking" != "t" ]]; then
  if [[ "${PHASE1B_REGISTER_BASELINE:-0}" != "1" ]]; then
    echo "Suivi canonique absent; PHASE1B_REGISTER_BASELINE=1 requis" >&2
    exit 2
  fi
  "${psql[@]}" --single-transaction \
    --command "SELECT pg_advisory_xact_lock(hashtext('synaura-schema-migrations'))" \
    --command "CREATE SCHEMA IF NOT EXISTS synaura_private" \
    --command "CREATE TABLE synaura_private.schema_migrations (version text PRIMARY KEY CHECK (version ~ '^[0-9]{14}$'), name text NOT NULL, checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'), applied_at timestamptz NOT NULL DEFAULT now(), applied_by text NOT NULL DEFAULT current_user)" \
    --command "INSERT INTO synaura_private.schema_migrations(version,name,checksum) VALUES ('$BASELINE_VERSION','production_baseline','$baseline_checksum')" >/dev/null
  echo "BASELINE_REGISTERED=$BASELINE_VERSION"
else
  registered_baseline="$("${psql[@]}" --tuples-only --no-align \
    --command "SELECT checksum FROM synaura_private.schema_migrations WHERE version='$BASELINE_VERSION'")"
  if [[ "$registered_baseline" != "$baseline_checksum" ]]; then
    echo "Checksum baseline absent ou different" >&2
    exit 1
  fi
fi

while IFS= read -r migration; do
  filename="$(basename "$migration")"
  [[ "$filename" =~ ^([0-9]{14})_([a-z0-9_]+)\.sql$ ]] || { echo "Migration invalide: $filename" >&2; exit 2; }
  version="${BASH_REMATCH[1]}"
  name="${BASH_REMATCH[2]}"
  [[ "$version" > "$BASELINE_VERSION" ]] || { echo "Migration anterieure a la baseline" >&2; exit 2; }
  checksum="$(sha256sum "$migration" | cut -d' ' -f1)"
  registered="$("${psql[@]}" --tuples-only --no-align \
    --command "SELECT checksum FROM synaura_private.schema_migrations WHERE version='$version'")"
  if [[ -n "$registered" ]]; then
    [[ "$registered" == "$checksum" ]] || { echo "Checksum modifie: $filename" >&2; exit 1; }
    echo "ALREADY_APPLIED=$filename"
    continue
  fi
  "${psql[@]}" --single-transaction \
    --command "SELECT pg_advisory_xact_lock(hashtext('synaura-schema-migrations'))" \
    --command "SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'" \
    --file "$migration" \
    --command "INSERT INTO synaura_private.schema_migrations(version,name,checksum) VALUES ('$version','$name','$checksum')" >/dev/null
  echo "APPLIED=$filename"
done < <(find "$ROOT_DIR/database/migrations" -maxdepth 1 -type f -name '[0-9]*_*.sql' -print | sort)

"${psql[@]}" --file "$ROOT_DIR/database/reference/validate-phase1b.sql" >/dev/null
echo "PHASE1B_MIGRATIONS=pass"
