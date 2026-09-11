#!/usr/bin/env bash
set -Eeuo pipefail

script="${1:-$(cd "$(dirname "$0")/.." && pwd)/scripts/prune-releases.sh}"
[[ -x "$script" ]] || { echo "retention script is not executable: $script" >&2; exit 1; }
test_root="$(mktemp -d /tmp/synaura-retention-test.XXXXXX)"
trap 'rm -rf -- "$test_root"' EXIT
passed=0

ok() { passed=$((passed + 1)); printf 'ok %s - %s\n' "$passed" "$1"; }
fail() { printf 'not ok - %s\n' "$1" >&2; exit 1; }
assert_has() { grep -F -- "$2" "$1" >/dev/null || fail "missing output: $2"; }

fixture() {
  rm -rf -- "$test_root"
  mkdir -p "$test_root/seed" "$test_root/state" "$test_root/releases"
  git init -q --bare "$test_root/repo.git"
  git -C "$test_root/seed" init -q
  git -C "$test_root/seed" config user.email retention-test@synaura.invalid
  git -C "$test_root/seed" config user.name 'Synaura retention test'
  shas=()
  for number in 1 2 3 4 5; do
    printf '%s\n' "$number" >"$test_root/seed/version"
    git -C "$test_root/seed" add version
    git -C "$test_root/seed" commit -q -m "release $number"
    shas+=("$(git -C "$test_root/seed" rev-parse HEAD)")
  done
  git -C "$test_root/seed" remote add origin "$test_root/repo.git"
  git -C "$test_root/seed" push -q origin HEAD:main
  for index in 0 1 2 3 4; do
    git -C "$test_root/repo.git" worktree add -q --detach "$test_root/releases/${shas[$index]}" "${shas[$index]}"
    touch -d "2026-01-0$((index + 1)) 00:00:00 UTC" "$test_root/releases/${shas[$index]}"
  done
  ln -s "$test_root/releases/${shas[4]}" "$test_root/current"
  printf '%s\n' "${shas[4]}" >"$test_root/state/last-successful-sha"
  printf '%s\n' "${shas[0]}" >"$test_root/pins.txt"
}

run_retention() {
  env \
    SYNAURA_REPO="$test_root/repo.git" \
    SYNAURA_CURRENT_LINK="$test_root/current" \
    SYNAURA_RELEASE_ROOT="$test_root/releases" \
    SYNAURA_EXPECTED_RELEASE_ROOT="${SYNAURA_EXPECTED_RELEASE_ROOT:-$test_root/releases}" \
    SYNAURA_DEPLOY_STATE="$test_root/state" \
    SYNAURA_RELEASE_PINS_FILE="$test_root/pins.txt" \
    SYNAURA_RETENTION_SKIP_PROC_SCAN=1 \
    "$script" "$@"
}

fixture
run_retention --dry-run >"$test_root/output"
assert_has "$test_root/output" "ACTIVE ${shas[4]}"
ok 'active release is protected'
assert_has "$test_root/output" "PREVIOUS ${shas[3]}"
assert_has "$test_root/output" "PREVIOUS ${shas[2]}"
ok 'two newest previous releases are protected'
assert_has "$test_root/output" "PINNED ${shas[0]} present=yes"
ok 'explicit pin is protected'
assert_has "$test_root/output" "CANDIDATE ${shas[1]}"
ok 'unprotected old release is selected'
[[ -d "$test_root/releases/${shas[1]}" ]] || fail 'dry-run deleted a release'
ok 'dry-run does not delete'

printf '%040d\n' 9 >"$test_root/state/last-successful-sha"
if run_retention --dry-run >"$test_root/incoherent" 2>&1; then fail 'incoherent current was accepted'; fi
assert_has "$test_root/incoherent" 'RETENTION REFUSED'
printf '%s\n' "${shas[4]}" >"$test_root/state/last-successful-sha"
ok 'incoherent current is refused'

SYNAURA_RETENTION_IN_USE_SHAS="${shas[1]}" run_retention --dry-run >"$test_root/in-use"
assert_has "$test_root/in-use" "IN_USE ${shas[1]}"
if grep -F "CANDIDATE ${shas[1]}" "$test_root/in-use" >/dev/null; then fail 'in-use release became a candidate'; fi
ok 'process/worktree-use protection wins'

printf 'changed\n' >"$test_root/releases/${shas[1]}/version"
run_retention --dry-run >"$test_root/dirty"
assert_has "$test_root/dirty" "DIRTY_PROTECTED ${shas[1]}"
git -C "$test_root/releases/${shas[1]}" checkout -q -- version
touch -d '2026-01-02 00:00:00 UTC' "$test_root/releases/${shas[1]}"
ok 'dirty worktree is protected'

SYNAURA_KEEP_PREVIOUS=4 run_retention --dry-run >"$test_root/minimum"
assert_has "$test_root/minimum" 'candidates=0'
ok 'minimum retained set cannot be pruned'

mkdir -p "$test_root/not-the-release-root"
if SYNAURA_EXPECTED_RELEASE_ROOT="$test_root/not-the-release-root" run_retention --dry-run >"$test_root/wrong-root" 2>&1; then fail 'wrong release root was accepted'; fi
assert_has "$test_root/wrong-root" 'unexpected release root'
ok 'wrong release root is refused'

printf '%s\n' "${shas[0]}" >"$test_root/pins.txt"
run_retention --apply >"$test_root/apply"
[[ ! -e "$test_root/releases/${shas[1]}" ]] || fail 'apply did not remove candidate'
[[ -d "$test_root/releases/${shas[4]}" && -d "$test_root/releases/${shas[3]}" && -d "$test_root/releases/${shas[2]}" && -d "$test_root/releases/${shas[0]}" ]] || fail 'apply removed a protected release'
assert_has "$test_root/apply" 'RETENTION COMPLETE removed=1'
ok 'apply is Git-aware and removes only the candidate'

printf 'PASS %s retention checks\n' "$passed"
