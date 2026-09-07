#!/usr/bin/env bash
set -Eeuo pipefail

app_url="${SYNAURA_APP_URL:-http://127.0.0.1:3000/}"
pg_service="${SYNAURA_PG_SERVICE:-synaura_backup}"
pg_os_user="${SYNAURA_PG_OS_USER:-postgres}"
pg_bin_dir="${SYNAURA_PG_BIN_DIR:-/usr/lib/postgresql/17/bin}"
media_mount="${SYNAURA_MEDIA_MOUNT:-/mnt/Synaura-SSD}"
media_root="${SYNAURA_MEDIA_ROOT:-/mnt/Synaura-SSD/apps/synaura/media}"
expected_source="${SYNAURA_MEDIA_EXPECTED_SOURCE:-//mafreebox.freebox.fr/Synaura SSD}"
media_marker="${SYNAURA_MEDIA_MARKER:-$media_mount/.synaura-volume.id}"
expected_marker="${SYNAURA_MEDIA_EXPECTED_MARKER:-/etc/synaura/media-volume.id}"
postgres_data="${SYNAURA_POSTGRES_DATA:-/var/lib/postgresql/17/restore}"
warning_threshold="${SYNAURA_DISK_WARNING_PERCENT:-80}"
critical_threshold="${SYNAURA_DISK_CRITICAL_PERCENT:-90}"
app_user="${SYNAURA_APP_USER:-synaura}"
status=0

report() {
  local level="$1"
  shift
  printf '%s %s\n' "$level" "$*"
  command -v logger >/dev/null 2>&1 && logger -t synaura-health -- "$level $*" || true
}

critical() { report CRITICAL "$*"; status=2; }
warning() {
  report WARNING "$*"
  [[ "$status" -eq 2 ]] || status=1
}

if curl --fail --silent --show-error --max-time 8 --output /dev/null "$app_url"; then
  report OK "Next.js repond: $app_url"
else
  critical "Next.js indisponible: $app_url"
fi

if [[ -x "$pg_bin_dir/psql" ]] &&
   [[ "$(runuser -u "$pg_os_user" -- "$pg_bin_dir/psql" -XAt \
     --dbname="service=$pg_service" --command='select 1' 2>/dev/null)" == 1 ]]; then
  report OK "PostgreSQL execute une requete via le service $pg_service"
else
  critical "PostgreSQL indisponible via le service $pg_service"
fi

actual_source="$(findmnt -T "$media_mount" -n -o SOURCE 2>/dev/null || true)"
if mountpoint -q -- "$media_mount" &&
   [[ "$actual_source" == "$expected_source" ]] &&
   [[ -r "$media_marker" && -r "$expected_marker" ]] &&
   cmp -s -- "$media_marker" "$expected_marker" &&
   [[ -r "$media_root" && -x "$media_root" ]]; then
  if id "$app_user" >/dev/null 2>&1 && runuser -u "$app_user" -- test -w "$media_root"; then
    report OK "volume media monte et accessible par $app_user"
  else
    critical "volume media non inscriptible par $app_user"
  fi
else
  critical "volume media absent, inattendu ou marqueur invalide: $media_mount"
fi

check_disk() {
  local path="$1" usage
  [[ -e "$path" ]] || return 0
  usage="$(df --output=pcent -- "$path" | awk 'NR==2 {gsub(/%/, "", $1); print $1}')"
  [[ "$usage" =~ ^[0-9]+$ ]] || { warning "occupation disque illisible: $path"; return; }
  if (( usage >= critical_threshold )); then
    critical "disque critique: $path (${usage}%)"
  elif (( usage >= warning_threshold )); then
    warning "disque en alerte: $path (${usage}%)"
  else
    report OK "disque: $path (${usage}%)"
  fi
}

check_disk /
check_disk "$media_mount"
check_disk "$postgres_data"
[[ -n "${SYNAURA_DB_BACKUP_ROOT:-}" ]] && check_disk "$SYNAURA_DB_BACKUP_ROOT"
[[ -n "${SYNAURA_MEDIA_BACKUP_ROOT:-}" ]] && check_disk "$SYNAURA_MEDIA_BACKUP_ROOT"

exit "$status"
