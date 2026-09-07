#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

media_root="${SYNAURA_MEDIA_ROOT:-/mnt/Synaura-SSD/apps/synaura/media}"
media_mount="${SYNAURA_MEDIA_MOUNT:-/mnt/Synaura-SSD}"
backup_root="${SYNAURA_MEDIA_BACKUP_ROOT:-}"
retention_days="${SYNAURA_MEDIA_RETENTION_DAYS:-14}"
allow_same_device="${SYNAURA_ALLOW_SAME_DEVICE_BACKUP:-0}"
expected_source="${SYNAURA_MEDIA_EXPECTED_SOURCE:-//mafreebox.freebox.fr/Synaura SSD}"
media_marker="${SYNAURA_MEDIA_MARKER:-$media_mount/.synaura-volume.id}"
expected_marker="${SYNAURA_MEDIA_EXPECTED_MARKER:-/etc/synaura/media-volume.id}"
check_only=0
[[ "${1:-}" == --check ]] && check_only=1

die() { printf 'BACKUP MEDIA CRITICAL: %s\n' "$*" >&2; exit 2; }
log() { printf 'BACKUP MEDIA: %s\n' "$*"; command -v logger >/dev/null 2>&1 && logger -t synaura-media-backup -- "$*" || true; }

[[ -n "$backup_root" ]] || die "SYNAURA_MEDIA_BACKUP_ROOT absent"
[[ "$retention_days" =~ ^[0-9]+$ ]] || die "retention invalide"
mountpoint -q -- "$media_mount" || die "volume source non monte: $media_mount"
[[ "$(findmnt -T "$media_mount" -n -o SOURCE)" == "$expected_source" ]] ||
  die "source media inattendue"
[[ -r "$media_marker" && -r "$expected_marker" ]] || die "marqueur media absent"
cmp -s -- "$media_marker" "$expected_marker" || die "marqueur media invalide"
[[ -d "$media_root" && -r "$media_root" ]] || die "racine media absente ou illisible"

media_root="$(readlink -e -- "$media_root")"
backup_root="$(readlink -m -- "$backup_root")"
case "$backup_root" in
  /|/var|/var/backups|/mnt|/media|/home|"$media_root"|"$media_root"/*)
    die "destination dangereuse: $backup_root" ;;
esac

for command_name in rsync flock findmnt; do
  command -v "$command_name" >/dev/null 2>&1 || die "commande absente: $command_name"
done

if [[ "$check_only" -eq 1 ]]; then
  [[ -d "$backup_root" ]] || die "destination absente en mode check: $backup_root"
else
  mkdir -p -- "$backup_root"
fi
source_device="$(findmnt -T "$media_root" -n -o SOURCE)"
backup_device="$(findmnt -T "$backup_root" -n -o SOURCE)"
if [[ "$source_device" == "$backup_device" && "$allow_same_device" != 1 ]]; then
  die "source et sauvegarde partagent $source_device; utiliser un autre volume"
fi
if [[ "$check_only" -eq 1 ]]; then
  printf 'CHECK OK source=%s destination=%s retention=%s jours\n' \
    "$source_device" "$backup_device" "$retention_days"
  exit 0
fi

exec 9>"$backup_root/.backup.lock"
flock -n 9 || die "une sauvegarde est deja en cours"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
partial="$backup_root/.partial-$stamp-$$"
final="$backup_root/$stamp"
trap 'case "$partial" in "$backup_root"/.partial-*) rm -rf -- "$partial" ;; esac' EXIT
mkdir -- "$partial"

link_args=()
if [[ -L "$backup_root/current" ]]; then
  previous="$(readlink -e -- "$backup_root/current" || true)"
  case "$previous" in "$backup_root"/*) link_args=(--link-dest="$previous") ;; esac
fi

log "debut vers $final"
rsync --archive --hard-links --numeric-ids --safe-links --one-file-system \
  --omit-dir-times --delete-delay \
  "${link_args[@]}" -- "$media_root/" "$partial/"
mv -- "$partial" "$final"
# rsync --archive recopie le mtime ancien de la racine source. Sans ce touch,
# la retention pourrait supprimer immediatement un snapshot neuf.
touch -- "$final"
ln -sfn -- "$(basename "$final")" "$backup_root/current"

while IFS= read -r -d '' old_snapshot; do
  case "$old_snapshot" in "$backup_root"/20*T*Z) rm -rf -- "$old_snapshot" ;; esac
done < <(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name '20*T*Z' -mtime "+$retention_days" -print0)

trap - EXIT
log "succes source=$source_device destination=$backup_device"
