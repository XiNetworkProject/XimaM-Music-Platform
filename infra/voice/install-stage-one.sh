#!/usr/bin/env bash
# Explicit operator invocation only; does NOT enable application calls or alter NAT.
set -euo pipefail
umask 077
[[ ${EUID} -eq 0 && $(uname -m) == aarch64 ]] || exit 2
source_dir=$(cd -- "$(dirname -- "$0")" && pwd)
version=1.13.7
archive=livekit_1.13.7_linux_arm64.tar.gz
expected=5d167fdf52cf43c0c72972f25325364479f41f854bfef651056eab2504da5de9
for target in /etc/synaura-voice /opt/synaura-voice /etc/systemd/system/synaura-voice.service /etc/nginx/sites-available/synaura-voice /etc/nginx/sites-enabled/synaura-voice; do
    [[ ! -e "$target" && ! -L "$target" ]] || { echo "Refusing existing target: $target"; exit 3; }
done
! getent passwd synaura-voice >/dev/null || { echo 'Service account already exists; review required'; exit 3; }
systemctl is-active --quiet synaura
systemctl is-active --quiet nginx
nginx -t
cache=/var/cache/synaura-voice/1.13.7
install -d -m 0700 "$cache"
curl --fail --location --proto '=https' --tlsv1.2 --max-time 180 --output "$cache/$archive" "https://github.com/livekit/livekit/releases/download/v$version/$archive"
curl --fail --location --proto '=https' --tlsv1.2 --max-time 60 --output "$cache/checksums.txt" "https://github.com/livekit/livekit/releases/download/v$version/checksums.txt"
grep -Fx "$expected  $archive" "$cache/checksums.txt" >/dev/null
printf '%s  %s\n' "$expected" "$cache/$archive" | sha256sum --check --strict
# Extract only the expected binary, never arbitrary archive paths.
tar -xzf "$cache/$archive" -C "$cache" livekit-server
backup=/var/backups/synaura-config/voice-stage-one-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 0700 "$backup"
cp -a /etc/nginx "$backup/"
readlink -f /srv/apps/synaura/current > "$backup/application-release.txt"
sha256sum /etc/nginx/sites-available/synaura-phase0c /etc/nginx/sites-available/weyra.cloud > "$backup/existing-vhosts.sha256"
systemctl show synaura -p MainPID -p ActiveEnterTimestamp > "$backup/application-process.txt"
useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin synaura-voice
install -d -m 0755 /opt/synaura-voice/1.13.7
install -m 0755 "$cache/livekit-server" /opt/synaura-voice/1.13.7/livekit-server
install -d -m 0750 -o root -g synaura-voice /etc/synaura-voice
key="SV$(openssl rand -hex 12)"
secret=$(openssl rand -hex 48)
printf '%s: %s\n' "$key" "$secret" > /etc/synaura-voice/keys.yaml
chown root:synaura-voice /etc/synaura-voice/keys.yaml
chmod 0640 /etc/synaura-voice/keys.yaml
unset key secret
install -m 0640 -o root -g synaura-voice "$source_dir/livekit.freebox.yaml" /etc/synaura-voice/livekit.yaml
install -m 0644 "$source_dir/synaura-voice.service" /etc/systemd/system/synaura-voice.service
systemd-analyze verify /etc/systemd/system/synaura-voice.service
systemctl daemon-reload
systemctl start synaura-voice
for attempt in {1..15}; do
    if curl --fail --silent --max-time 3 http://127.0.0.1:7880/ >/dev/null; then break; fi
    sleep 1
done
curl --fail --silent --max-time 3 http://127.0.0.1:7880/
systemctl enable synaura-voice
install -d -m 0755 /var/lib/synaura-voice-acme/.well-known/acme-challenge
install -m 0644 "$source_dir/nginx-bootstrap.conf" /etc/nginx/sites-available/synaura-voice
ln -s /etc/nginx/sites-available/synaura-voice /etc/nginx/sites-enabled/synaura-voice
nginx -t
systemctl reload nginx
sha256sum --check "$backup/existing-vhosts.sha256"
systemctl is-active synaura nginx synaura-voice
printf '\nStage one installed; app flags unchanged. Backup: %s\n' "$backup"
