#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

repo="${SYNAURA_REPO:-/srv/apps/synaura/repo}"
current="${SYNAURA_CURRENT_LINK:-/srv/apps/synaura/current}"
releases="${SYNAURA_RELEASE_ROOT:-/srv/apps/synaura/releases}"
state="${SYNAURA_DEPLOY_STATE:-/var/lib/synaura-deploy}"
log="${SYNAURA_DEPLOY_LOG:-/var/log/synaura-deploy.log}"
environment_file="${SYNAURA_ENV_FILE:-/etc/synaura/synaura.env}"
branch="${SYNAURA_DEPLOY_BRANCH:-migration/freebox-storage}"
service_name="${SYNAURA_SERVICE_NAME:-synaura.service}"
health_url="${SYNAURA_APP_URL:-http://127.0.0.1:3000/}"
check_only=0
[[ "${1:-}" == --check ]] && check_only=1

die() { printf 'DEPLOIEMENT REFUSE: %s\n' "$*" >&2; exit 2; }
for path in "$repo/.git" "$current/package.json" "$environment_file"; do
  [[ -e "$path" ]] || die "prerequis absent: $path"
done
for command_name in git flock runuser systemd-run systemctl curl mountpoint; do
  command -v "$command_name" >/dev/null 2>&1 || die "commande absente: $command_name"
done
mountpoint -q /mnt/Synaura-SSD || die "volume media non monte"

if [[ "$check_only" -eq 1 ]]; then
  systemd-run --quiet --wait --pipe --collect --uid=synaura \
    --property="WorkingDirectory=$current" \
    --property="EnvironmentFile=$environment_file" \
    /usr/local/libexec/synaura/preflight.sh
  printf 'CHECK OK repo=%s current=%s branch=%s service=%s\n' \
    "$repo" "$current" "$branch" "$service_name"
  exit 0
fi

exec >>"$log" 2>&1
printf '\n==================================================\nDEPLOY %s\n' "$(date -Is)"
exec 9>"$state/deploy.lock"
flock -n 9 || { echo 'Un deploiement est deja en cours.'; exit 0; }

runuser -u synaura -- git -C "$repo" fetch origin "$branch"
remote_sha="$(runuser -u synaura -- git -C "$repo" rev-parse "origin/$branch")"
current_sha="$(runuser -u synaura -- git -C "$current" rev-parse HEAD 2>/dev/null || true)"
echo "Actuel : ${current_sha:-inconnu}"
echo "Distant: $remote_sha"
[[ "$remote_sha" != "$current_sha" ]] || { echo 'Deja a jour.'; exit 0; }

release="$releases/$remote_sha"
previous_target="$(readlink -f "$current")"
[[ ! -e "$release" ]] || die "release deja existante: $release"
runuser -u synaura -- git -C "$repo" worktree add --detach "$release" "$remote_sha"
cleanup_release=1
cleanup() {
  if [[ "${cleanup_release:-0}" -eq 1 ]]; then
    runuser -u synaura -- git -C "$repo" worktree remove --force "$release" || true
  fi
}
trap cleanup EXIT

systemd-run --wait --pipe --collect --uid=synaura \
  --property="WorkingDirectory=$release" /usr/local/bin/npm ci
systemd-run --wait --pipe --collect --uid=synaura \
  --property="WorkingDirectory=$release" \
  --property="EnvironmentFile=$environment_file" \
  /usr/bin/env NODE_OPTIONS=--max-old-space-size=1536 /usr/local/bin/npm run build
systemd-run --quiet --wait --pipe --collect --uid=synaura \
  --property="WorkingDirectory=$release" \
  --property="EnvironmentFile=$environment_file" \
  /usr/local/libexec/synaura/preflight.sh

next_link="/srv/apps/synaura/.current-$remote_sha"
ln -s "$release" "$next_link"
mv -Tf "$next_link" "$current"
cleanup_release=0
trap - EXIT

systemctl restart "$service_name"
for _ in $(seq 1 20); do
  if systemctl is-active --quiet "$service_name" &&
     curl -fsS --max-time 8 -H 'Host: synaura.fr' "$health_url" -o /dev/null; then
    echo "$remote_sha" >"$state/last-successful-sha"
    echo "DEPLOIEMENT REUSSI : $remote_sha"
    exit 0
  fi
  sleep 1
done

echo "ECHEC du controle; rollback vers $previous_target"
rollback_link="/srv/apps/synaura/.current-rollback"
rm -f "$rollback_link"
ln -s "$previous_target" "$rollback_link"
mv -Tf "$rollback_link" "$current"
systemctl restart "$service_name"
exit 1
