#!/usr/bin/env bash
set -Eeuo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
maintenance_database="${PGDATABASE:-postgres}"
temporary_database="synaura_baseline_test_$(date -u +%Y%m%d%H%M%S)_$$"
created=0

cleanup() {
  if [[ "$created" == 1 ]]; then
    dropdb --if-exists --maintenance-db="$maintenance_database" "$temporary_database"
  fi
}
trap cleanup EXIT

case "$temporary_database" in
  postgres|template0|template1|synaura) printf 'Nom temporaire refuse\n' >&2; exit 2 ;;
esac

createdb --maintenance-db="$maintenance_database" --template=template0 "$temporary_database"
created=1

psql --dbname="$temporary_database" --set=ON_ERROR_STOP=1 \
  --file="$root_dir/database/baseline/000_prerequisite_roles.sql"
psql --dbname="$temporary_database" --set=ON_ERROR_STOP=1 \
  --file="$root_dir/database/baseline/010_production_schema.sql"
psql --dbname="$temporary_database" --set=ON_ERROR_STOP=1 \
  --file="$root_dir/database/reference/validate-reconstruction.sql"

printf 'RECONSTRUCTION_OK=%s\n' "$temporary_database"
