#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

pg_service="${SYNAURA_PG_SERVICE:-synaura_backup}"
pg_os_user="${SYNAURA_PG_OS_USER:-postgres}"
pg_bin_dir="${SYNAURA_PG_BIN_DIR:-/usr/lib/postgresql/17/bin}"
backup_root="${SYNAURA_DB_BACKUP_ROOT:-}"
encryption_key_file="${SYNAURA_DB_BACKUP_KEY:-/etc/synaura/backup-encryption.key}"
retention_days="${SYNAURA_DB_RETENTION_DAYS:-14}"
allow_same_device="${SYNAURA_ALLOW_SAME_DEVICE_BACKUP:-0}"
check_only=0
[[ "${1:-}" == --check ]] && check_only=1

die() { printf 'BACKUP POSTGRES CRITICAL: %s\n' "$*" >&2; exit 2; }
log() { printf 'BACKUP POSTGRES: %s\n' "$*"; command -v logger >/dev/null 2>&1 && logger -t synaura-db-backup -- "$*" || true; }

[[ -n "$backup_root" ]] || die "SYNAURA_DB_BACKUP_ROOT absent"
[[ -r "$encryption_key_file" ]] || die "cle de chiffrement absente ou illisible"
[[ "$retention_days" =~ ^[0-9]+$ ]] || die "retention invalide"
backup_root="$(readlink -m -- "$backup_root")"
case "$backup_root" in
  /|/var|/var/backups|/mnt|/media|/home) die "destination trop large: $backup_root" ;;
esac

for command_name in runuser flock sha256sum findmnt openssl mktemp; do
  command -v "$command_name" >/dev/null 2>&1 || die "commande absente: $command_name"
done
for pg_command in pg_dump pg_restore psql; do
  [[ -x "$pg_bin_dir/$pg_command" ]] || die "commande absente: $pg_bin_dir/$pg_command"
done
id "$pg_os_user" >/dev/null 2>&1 || die "utilisateur PostgreSQL absent: $pg_os_user"

if [[ "$check_only" -eq 1 ]]; then
  [[ -d "$backup_root" ]] || die "destination absente en mode check: $backup_root"
else
  mkdir -p -- "$backup_root"
  exec 9>"$backup_root/.backup.lock"
  flock -n 9 || die "une sauvegarde est deja en cours"
fi

data_directory="$(runuser -u "$pg_os_user" -- "$pg_bin_dir/psql" -XAt --dbname="service=$pg_service" --command='show data_directory' 2>/dev/null)" ||
  die "impossible de determiner le repertoire PostgreSQL"
[[ -d "$data_directory" ]] || die "repertoire PostgreSQL introuvable"

source_device="$(findmnt -T "$data_directory" -n -o SOURCE)"
backup_device="$(findmnt -T "$backup_root" -n -o SOURCE)"
if [[ "$source_device" == "$backup_device" && "$allow_same_device" != 1 ]]; then
  die "source et sauvegarde partagent $source_device; utiliser un autre volume"
fi
if [[ "$check_only" -eq 1 ]]; then
  printf 'CHECK OK service=%s source=%s destination=%s retention=%s jours\n' \
    "$pg_service" "$source_device" "$backup_device" "$retention_days"
  exit 0
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
partial="$backup_root/.synaura-$stamp.dump.enc.partial"
final="$backup_root/synaura-$stamp.dump.enc"
checksum="$final.sha256"
latest_tmp="$backup_root/.latest.txt.$$"
verify_tmp="$(mktemp /tmp/synaura-db-backup-verify.XXXXXX.dump)"
trap 'rm -f -- "$partial" "$latest_tmp" "$verify_tmp"' EXIT

log "debut vers $final"
runuser -u "$pg_os_user" -- "$pg_bin_dir/pg_dump" --dbname="service=$pg_service" \
  --format=custom --compress=6 --no-owner --no-privileges | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -md sha256 \
    -pass "file:$encryption_key_file" -out "$partial"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
  -pass "file:$encryption_key_file" -in "$partial" -out "$verify_tmp"
"$pg_bin_dir/pg_restore" --list "$verify_tmp" >/dev/null
rm -f -- "$verify_tmp"
mv -- "$partial" "$final"
(cd "$backup_root" && sha256sum "$(basename "$final")" >"$(basename "$checksum")")
# Le partage CIFS Freebox ne prend pas en charge les liens symboliques.
# Un petit pointeur texte remplace donc le lien latest.dump.
printf '%s\n' "$(basename "$final")" >"$latest_tmp"
mv -- "$latest_tmp" "$backup_root/latest.txt"

find "$backup_root" -maxdepth 1 -type f \( -name 'synaura-*.dump.enc' -o -name 'synaura-*.dump.enc.sha256' \) \
  -mtime "+$retention_days" -delete

trap - EXIT
log "succes taille=$(stat -c %s "$final") octets source=$source_device destination=$backup_device"
