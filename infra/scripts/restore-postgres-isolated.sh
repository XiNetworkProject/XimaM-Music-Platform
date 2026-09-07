#!/usr/bin/env bash
set -Eeuo pipefail

backup_file=''
target_db=''
pg_service="${SYNAURA_RESTORE_PG_SERVICE:-synaura_restore}"
pg_os_user="${SYNAURA_PG_OS_USER:-postgres}"
pg_bin_dir="${SYNAURA_PG_BIN_DIR:-/usr/lib/postgresql/17/bin}"
encryption_key_file="${SYNAURA_DB_BACKUP_KEY:-/etc/synaura/backup-encryption.key}"
check_only=0
drop_after_verify=0

usage() {
  printf 'Usage: %s --backup FILE --target-db NAME [--service NAME] [--check] [--drop-after-verify]\n' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup) backup_file="${2:-}"; shift 2 ;;
    --target-db) target_db="${2:-}"; shift 2 ;;
    --service) pg_service="${2:-}"; shift 2 ;;
    --check) check_only=1; shift ;;
    --drop-after-verify) drop_after_verify=1; shift ;;
    *) usage >&2; exit 2 ;;
  esac
done

[[ -f "$backup_file" ]] || { printf 'Sauvegarde introuvable\n' >&2; exit 2; }
[[ -r "$encryption_key_file" ]] || { printf 'Cle de chiffrement introuvable\n' >&2; exit 2; }
plain_tmp="$(mktemp /tmp/synaura-restore.XXXXXX.dump)"
created_here=0
run_pg() { runuser -u "$pg_os_user" -- "$@"; }
cleanup() {
  rm -f -- "$plain_tmp"
  if [[ "$created_here" -eq 1 && "$drop_after_verify" -eq 1 ]]; then
    run_pg "$pg_bin_dir/dropdb" --maintenance-db="service=$pg_service" "$target_db"
    printf 'Base isolee supprimee: %s\n' "$target_db"
  fi
}
trap cleanup EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
  -pass "file:$encryption_key_file" -in "$backup_file" -out "$plain_tmp"
chown "$pg_os_user:$pg_os_user" "$plain_tmp"
chmod 0600 "$plain_tmp"
"$pg_bin_dir/pg_restore" --list "$plain_tmp" >/dev/null
printf 'Archive pg_restore valide: %s\n' "$backup_file"
[[ "$check_only" -eq 1 ]] && exit 0

[[ "$target_db" =~ ^synaura_restore_[a-z0-9_]+$ ]] || {
  printf 'La base cible doit commencer par synaura_restore_\n' >&2
  exit 2
}
case "$target_db" in synaura|postgres|template0|template1) exit 2 ;; esac
[[ "${SYNAURA_RESTORE_ALLOW:-}" == YES ]] || {
  printf 'Definir SYNAURA_RESTORE_ALLOW=YES pour creer la base isolee\n' >&2
  exit 2
}

# createdb echoue si la cible existe : aucune base existante n'est ecrasee.
run_pg "$pg_bin_dir/createdb" --maintenance-db="service=$pg_service" "$target_db"
created_here=1
run_pg "$pg_bin_dir/pg_restore" --exit-on-error --no-owner --no-privileges \
  --dbname="service=$pg_service dbname=$target_db" "$plain_tmp"
run_pg "$pg_bin_dir/psql" -X --dbname="service=$pg_service dbname=$target_db" --set=ON_ERROR_STOP=1 <<'SQL'
select current_database(), current_user, version();
select count(*) as user_tables from pg_catalog.pg_tables
where schemaname not in ('pg_catalog', 'information_schema');
select count(*) as profiles from public.profiles;
select count(*) as tracks from public.tracks;
select count(*) as auth_users from auth.users;
SQL
printf 'Restauration isolee validee.\n'
