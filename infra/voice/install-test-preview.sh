#!/usr/bin/env bash
# Add/remove nothing in canonical application; only install this private preview vhost.
set -euo pipefail
umask 077
[[ ${EUID} -eq 0 ]] || exit 2
source_dir=$(cd -- "$(dirname -- "$0")" && pwd)
target=/etc/nginx/sites-available/synaura-voice-test
link=/etc/nginx/sites-enabled/synaura-voice-test
backup=/var/backups/synaura-config/voice-private-preview-20260924
case "${1:-}" in
  bootstrap)
    [[ ! -e "$target" && ! -L "$link" && ! -e "$backup" ]] || { echo 'Existing preview target; manual review required'; exit 3; }
    nginx -t
    systemctl is-active --quiet synaura
    install -d -m 0700 "$backup"
    sha256sum /etc/nginx/sites-available/synaura-phase0c /etc/nginx/sites-available/weyra.cloud /etc/nginx/sites-available/synaura-voice > "$backup/existing-vhosts.sha256"
    readlink -f /srv/apps/synaura/current > "$backup/release.txt"
    systemctl show synaura -p MainPID -p ActiveEnterTimestamp > "$backup/application-process.txt"
    install -m 0644 "$source_dir/nginx-test-bootstrap.conf" "$target"
    ln -s "$target" "$link"
    nginx -t
    systemctl reload nginx
    ;;
  enable)
    cmp --silent "$source_dir/nginx-test-bootstrap.conf" "$target" || { echo 'Preview bootstrap differs; manual review required'; exit 4; }
    [[ -s /etc/letsencrypt/live/synaura-voice-test/fullchain.pem ]]
    [[ $(readlink "$link") == "$target" ]]
    sha256sum --check "$backup/existing-vhosts.sha256"
    # The local Next instance must already refuse unauthenticated data requests.
    [[ $(curl --silent --max-time 10 -o /dev/null -w '%{http_code}' http://127.0.0.1:13331/api/messages/calls) == 401 ]]
    cp -a "$target" "$backup/bootstrap.conf"
    install -m 0644 "$source_dir/nginx-test.conf" "$target"
    if ! nginx -t; then
      install -m 0644 "$backup/bootstrap.conf" "$target"
      exit 5
    fi
    install -m 0755 "$source_dir/renew-test-certificate.sh" /etc/letsencrypt/renewal-hooks/deploy/synaura-voice-test
    systemctl reload nginx
    ;;
  *) echo 'Expected bootstrap or enable'; exit 2 ;;
esac
sha256sum --check "$backup/existing-vhosts.sha256"
diff -- "$backup/release.txt" <(readlink -f /srv/apps/synaura/current)
diff -- "$backup/application-process.txt" <(systemctl show synaura -p MainPID -p ActiveEnterTimestamp)
systemctl is-active synaura nginx synaura-voice
