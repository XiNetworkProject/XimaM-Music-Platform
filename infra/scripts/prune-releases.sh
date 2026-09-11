#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

mode=dry-run
case "${1:---dry-run}" in
  --dry-run) ;;
  --apply) mode=apply ;;
  *) printf 'Usage: %s [--dry-run|--apply]\n' "$0" >&2; exit 2 ;;
esac

repo="${SYNAURA_REPO:-/srv/apps/synaura/repo}"
current_link="${SYNAURA_CURRENT_LINK:-/srv/apps/synaura/current}"
release_root="${SYNAURA_RELEASE_ROOT:-/srv/apps/synaura/releases}"
expected_root="${SYNAURA_EXPECTED_RELEASE_ROOT:-/srv/apps/synaura/releases}"
state="${SYNAURA_DEPLOY_STATE:-/var/lib/synaura-deploy}"
pins_file="${SYNAURA_RELEASE_PINS_FILE:-$current_link/infra/release-pins.txt}"
keep_previous="${SYNAURA_KEEP_PREVIOUS:-2}"
warning_percent="${SYNAURA_DISK_WARNING_PERCENT:-80}"
critical_percent="${SYNAURA_DISK_CRITICAL_PERCENT:-90}"
release_owner="${SYNAURA_RELEASE_OWNER:-synaura}"

die() { printf 'RETENTION REFUSED: %s\n' "$*" >&2; exit 2; }
is_sha() { [[ "$1" =~ ^[0-9a-f]{40}$ ]]; }
contains() {
  local needle="$1" value
  shift
  for value in "$@"; do [[ "$value" == "$needle" ]] && return 0; done
  return 1
}
repo_git() {
  if [[ "$EUID" -eq 0 ]] && command -v runuser >/dev/null 2>&1 && id "$release_owner" >/dev/null 2>&1; then
    runuser -u "$release_owner" -- git -C "$repo" "$@"
  else
    git -C "$repo" "$@"
  fi
}
release_from_path() {
  local path="$1" relative sha
  [[ "$path" == "$release_root/"* ]] || return 1
  relative="${path#"$release_root/"}"
  sha="${relative%%/*}"
  is_sha "$sha" || return 1
  printf '%s\n' "$sha"
}

for command_name in git readlink stat sort du df find awk tr; do
  command -v "$command_name" >/dev/null 2>&1 || die "missing command: $command_name"
done
[[ "$keep_previous" =~ ^[0-9]+$ ]] || die 'SYNAURA_KEEP_PREVIOUS must be an integer'
(( keep_previous >= 1 )) || die 'at least one previous release must be retained'
[[ "$warning_percent" =~ ^[0-9]+$ && "$critical_percent" =~ ^[0-9]+$ ]] || die 'disk thresholds must be integers'
(( warning_percent < critical_percent && critical_percent <= 100 )) || die 'invalid disk thresholds'

release_root="$(readlink -f -- "$release_root")" || die 'cannot resolve release root'
expected_root="$(readlink -f -- "$expected_root")" || die 'cannot resolve expected release root'
[[ "$release_root" == "$expected_root" ]] || die "unexpected release root: $release_root"
[[ "$release_root" != / && "$release_root" != /srv && "$release_root" != /srv/apps ]] || die 'release root is too broad'
[[ -d "$release_root" ]] || die "release root missing: $release_root"
[[ -d "$repo" ]] || die "repository missing: $repo"
repo_git rev-parse --git-dir >/dev/null 2>&1 || die "invalid Git repository: $repo"
[[ -L "$current_link" ]] || die "current is not a symlink: $current_link"
active_path="$(readlink -f -- "$current_link")" || die 'cannot resolve current symlink'
[[ "$active_path" == "$release_root/"* ]] || die "current points outside release root: $active_path"
active_sha="${active_path##*/}"
is_sha "$active_sha" || die "current target is not a full Git SHA: $active_sha"
[[ "$active_path" == "$release_root/$active_sha" && -d "$active_path" ]] || die 'current target is incoherent'
[[ -f "$state/last-successful-sha" ]] || die 'last-successful-sha is missing'
last_success="$(tr -d '[:space:]' <"$state/last-successful-sha")"
[[ "$last_success" == "$active_sha" ]] || die "current ($active_sha) differs from last successful release ($last_success)"
[[ -r "$pins_file" ]] || die "pins file missing or unreadable: $pins_file"

declare -a releases=() worktrees=() pins=() previous=() in_use=() candidates=() dirty=()
declare -A worktree_count=() protected=()
while IFS= read -r -d '' release_path; do
  sha="${release_path##*/}"
  is_sha "$sha" || die "non-SHA directory found under release root: $release_path"
  releases+=("$sha")
done < <(find "$release_root" -mindepth 1 -maxdepth 1 -type d -print0)
((${#releases[@]} >= 1)) || die 'no release found'
contains "$active_sha" "${releases[@]}" || die 'active release is not present in release inventory'

while IFS= read -r line; do
  [[ "$line" == worktree\ * ]] || continue
  worktree_path="${line#worktree }"
  worktree_path="$(readlink -f -- "$worktree_path")" || die "cannot resolve worktree: ${line#worktree }"
  worktrees+=("$worktree_path")
  if [[ "$worktree_path" == "$release_root/"* ]]; then
    sha="$(release_from_path "$worktree_path")" || die "ambiguous worktree below release root: $worktree_path"
    [[ "$worktree_path" == "$release_root/$sha" ]] || die "nested worktree below release root: $worktree_path"
    worktree_count["$sha"]=$(( ${worktree_count["$sha"]:-0} + 1 ))
  fi
done < <(repo_git worktree list --porcelain)
for sha in "${releases[@]}"; do
  [[ "${worktree_count[$sha]:-0}" -eq 1 ]] || die "release has missing or duplicate worktree metadata: $sha"
done

while IFS= read -r pin_line || [[ -n "$pin_line" ]]; do
  pin_line="${pin_line%%#*}"
  pin_line="${pin_line//[[:space:]]/}"
  [[ -z "$pin_line" ]] && continue
  is_sha "$pin_line" || die "invalid pin (full SHA required): $pin_line"
  contains "$pin_line" "${pins[@]}" || pins+=("$pin_line")
done <"$pins_file"

protected["$active_sha"]='ACTIVE'
for sha in "${pins[@]}"; do
  if contains "$sha" "${releases[@]}"; then
    protected["$sha"]='PINNED'
  else
    printf 'NOTICE missing pinned release: %s\n' "$sha" >&2
  fi
done

while IFS=' ' read -r _ sha; do
  [[ -n "${sha:-}" && "$sha" != "$active_sha" ]] || continue
  previous+=("$sha")
  protected["$sha"]='PREVIOUS'
  ((${#previous[@]} >= keep_previous)) && break
done < <(
  for sha in "${releases[@]}"; do
    [[ "$sha" == "$active_sha" ]] && continue
    printf '%s %s\n' "$(stat -c %Y "$release_root/$sha")" "$sha"
  done | sort -rn
)

if [[ "${SYNAURA_RETENTION_SKIP_PROC_SCAN:-0}" != 1 ]]; then
  declare -A process_seen=()
  for proc_ref in /proc/[0-9]*/cwd /proc/[0-9]*/exe /proc/[0-9]*/fd/*; do
    [[ -L "$proc_ref" ]] || continue
    referenced_path="$(readlink -f -- "$proc_ref" 2>/dev/null || true)"
    [[ -n "$referenced_path" ]] || continue
    sha="$(release_from_path "$referenced_path" 2>/dev/null || true)"
    [[ -n "$sha" ]] || continue
    process_seen["$sha"]=1
  done
  for sha in "${!process_seen[@]}"; do in_use+=("$sha"); done
fi
for sha in ${SYNAURA_RETENTION_IN_USE_SHAS:-}; do
  is_sha "$sha" || die "invalid test/override in-use SHA: $sha"
  contains "$sha" "${in_use[@]}" || in_use+=("$sha")
done
for sha in "${in_use[@]}"; do protected["$sha"]='IN_USE'; done

for sha in "${releases[@]}"; do
  [[ -z "${protected[$sha]:-}" ]] || continue
  if [[ -n "$(repo_git -C "$release_root/$sha" status --porcelain --untracked-files=no)" ]]; then
    dirty+=("$sha")
    protected["$sha"]='DIRTY'
    continue
  fi
  candidates+=("$sha")
done

remaining_count=$(( ${#releases[@]} - ${#candidates[@]} ))
minimum_count=$(( keep_previous + 1 ))
(( remaining_count >= 1 )) || die 'candidate set would delete every release'
(( remaining_count >= minimum_count || ${#releases[@]} < minimum_count )) || die "candidate set violates minimum release count: $minimum_count"

disk_percent="$(df -P "$release_root" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
[[ "$disk_percent" =~ ^[0-9]+$ ]] || die 'cannot determine disk use percentage'
(( disk_percent < warning_percent )) || printf 'WARNING disk usage is %s%% (warning=%s%% critical=%s%%)\n' "$disk_percent" "$warning_percent" "$critical_percent" >&2

printf 'RETENTION mode=%s root=%s disk=%s%% keep_previous=%s\n' "$mode" "$release_root" "$disk_percent" "$keep_previous"
printf 'ACTIVE %s\n' "$active_sha"
for sha in "${pins[@]}"; do printf 'PINNED %s present=%s\n' "$sha" "$(contains "$sha" "${releases[@]}" && printf yes || printf no)"; done
for sha in "${previous[@]}"; do printf 'PREVIOUS %s\n' "$sha"; done
for sha in "${in_use[@]}"; do printf 'IN_USE %s\n' "$sha"; done
for sha in "${dirty[@]}"; do printf 'DIRTY_PROTECTED %s\n' "$sha"; done

recoverable=0
for sha in "${candidates[@]}"; do
  bytes="$(du -sb -- "$release_root/$sha" | awk '{print $1}')"
  recoverable=$(( recoverable + bytes ))
  printf 'CANDIDATE %s bytes=%s\n' "$sha" "$bytes"
done
printf 'SUMMARY releases=%s retained=%s candidates=%s recoverable_bytes=%s\n' \
  "${#releases[@]}" "$remaining_count" "${#candidates[@]}" "$recoverable"

[[ "$mode" == apply ]] || exit 0
for sha in "${candidates[@]}"; do
  current_now="$(readlink -f -- "$current_link")" || die 'current became unreadable during cleanup'
  [[ "$current_now" == "$active_path" ]] || die 'current changed during cleanup'
  last_success_now="$(tr -d '[:space:]' <"$state/last-successful-sha")"
  [[ "$last_success_now" == "$active_sha" ]] || die 'last successful release changed during cleanup'
  [[ ! -n "${protected[$sha]:-}" ]] || die "candidate became protected: $sha"
  [[ -z "$(repo_git -C "$release_root/$sha" status --porcelain --untracked-files=no)" ]] || die "candidate became dirty: $sha"
  if [[ "${SYNAURA_RETENTION_SKIP_PROC_SCAN:-0}" != 1 ]]; then
    for proc_ref in /proc/[0-9]*/cwd /proc/[0-9]*/exe /proc/[0-9]*/fd/*; do
      [[ -L "$proc_ref" ]] || continue
      referenced_path="$(readlink -f -- "$proc_ref" 2>/dev/null || true)"
      [[ "$referenced_path" != "$release_root/$sha" && "$referenced_path" != "$release_root/$sha/"* ]] || die "candidate is now used by a process: $sha"
    done
  fi
  printf 'REMOVE %s\n' "$sha"
  repo_git worktree remove --force "$release_root/$sha"
  [[ ! -e "$release_root/$sha" ]] || die "release still exists after Git removal: $sha"
done
repo_git worktree prune --verbose --expire now

disk_after="$(df -P "$release_root" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
printf 'RETENTION COMPLETE removed=%s disk_before=%s%% disk_after=%s%%\n' "${#candidates[@]}" "$disk_percent" "$disk_after"
if (( disk_after >= critical_percent )); then
  printf 'RETENTION CRITICAL: disk remains at %s%% after all safe candidates were processed\n' "$disk_after" >&2
  exit 3
fi
