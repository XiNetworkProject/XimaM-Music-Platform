#!/usr/bin/env bash
set -Eeuo pipefail

media_mount="${SYNAURA_MEDIA_MOUNT:-/mnt/Synaura-SSD}"
media_root="${SYNAURA_MEDIA_ROOT:-/mnt/Synaura-SSD/apps/synaura/media}"
expected_source="${SYNAURA_MEDIA_EXPECTED_SOURCE:-//mafreebox.freebox.fr/Synaura SSD}"
media_marker="${SYNAURA_MEDIA_MARKER:-$media_mount/.synaura-volume.id}"
expected_marker="${SYNAURA_MEDIA_EXPECTED_MARKER:-/etc/synaura/media-volume.id}"
postgres_port="${SYNAURA_POSTGRES_PORT:-5433}"
app_user="${SYNAURA_APP_USER:-synaura}"

fail() {
  printf 'PREFLIGHT CRITICAL: %s\n' "$*" >&2
  exit 2
}

for variable in DATABASE_URL NEXTAUTH_SECRET; do
  [[ -n "${!variable:-}" ]] || fail "variable requise absente: $variable"
done

command -v node >/dev/null 2>&1 || fail "node absent du PATH"
command -v npm >/dev/null 2>&1 || fail "npm absent du PATH"
[[ -f .next/BUILD_ID ]] || fail "build Next.js absent (.next/BUILD_ID)"
mountpoint -q -- "$media_mount" || fail "volume media non monte: $media_mount"
actual_source="$(findmnt -T "$media_mount" -n -o SOURCE)"
actual_fstype="$(findmnt -T "$media_mount" -n -o FSTYPE)"
[[ "$actual_source" == "$expected_source" ]] ||
  fail "source media inattendue: $actual_source"
[[ "$actual_fstype" == cifs ]] || fail "filesystem media inattendu: $actual_fstype"
[[ -r "$media_marker" && -r "$expected_marker" ]] ||
  fail "marqueur media absent"
cmp -s -- "$media_marker" "$expected_marker" || fail "marqueur media invalide"
[[ -d "$media_root" ]] || fail "racine media absente: $media_root"
if id "$app_user" >/dev/null 2>&1; then
  if [[ "$(id -un)" == "$app_user" ]]; then
    test -r "$media_root" && test -x "$media_root" && test -w "$media_root" ||
      fail "racine media non accessible par $app_user"
  else
    runuser -u "$app_user" -- test -r "$media_root" &&
      runuser -u "$app_user" -- test -x "$media_root" &&
      runuser -u "$app_user" -- test -w "$media_root" ||
        fail "racine media non accessible par $app_user"
  fi
else
  fail "utilisateur applicatif absent: $app_user"
fi

if command -v pg_isready >/dev/null 2>&1; then
  pg_isready -q -h 127.0.0.1 -p "$postgres_port" ||
    fail "PostgreSQL ne repond pas sur 127.0.0.1:$postgres_port"
fi

printf 'PREFLIGHT OK\n'
