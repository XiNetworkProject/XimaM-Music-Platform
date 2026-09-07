#!/usr/bin/env bash
set -Eeuo pipefail

section() { printf '\n===== %s =====\n' "$1"; }
available() { command -v "$1" >/dev/null 2>&1; }
postgres_port="${SYNAURA_POSTGRES_PORT:-5433}"
postgres_database="${SYNAURA_POSTGRES_DATABASE:-postgres}"
redact() {
  sed -E \
    -e 's#(postgres(ql)?://[^:/[:space:]]+:)[^@/[:space:]]+@#\1<redacted>@#gI' \
    -e 's#((password|passwd|token|secret|api[_-]?key)=)[^[:space:]]+#\1<redacted>#gI' \
    -e 's#((--password|--token|--secret)[=[:space:]]+)[^[:space:]]+#\1<redacted>#gI'
}

section 'IDENTITE ET OS'
hostname || true
id || true
uname -a || true
[[ -r /etc/os-release ]] && sed -n '1,20p' /etc/os-release
uptime || true
date -Is || true

section 'OUTILS ET PROJET'
for tool in node npm npx git psql pg_dump pg_restore systemctl; do
  if available "$tool"; then
    printf '%-12s %s\n' "$tool" "$(command -v "$tool")"
    if [[ "$tool" == nginx ]]; then nginx -v 2>&1; else "$tool" --version 2>&1 | head -n 2 || true; fi
  else
    printf '%-12s ABSENT\n' "$tool"
  fi
done
if [[ -x /usr/sbin/nginx ]]; then
  printf '%-12s %s\n' nginx /usr/sbin/nginx
  /usr/sbin/nginx -v 2>&1
else
  printf '%-12s ABSENT\n' nginx
fi
if available systemctl; then
  systemctl show synaura.service -p LoadState -p ActiveState -p SubState -p User -p Group \
    -p WorkingDirectory -p ExecStart -p MainPID -p NRestarts -p EnvironmentFiles \
    -p ReadWritePaths -p ProtectSystem -p UMask 2>/dev/null | redact || true
  systemctl list-units --type=service --all --no-pager | grep -Ei 'synaura|next|node|nginx|postgres|pm2|docker' || true
  systemctl list-timers --all --no-pager | grep -Ei 'synaura|backup|certbot|letsencrypt' || true
fi
ps -eo user,pid,ppid,lstart,rss,comm --sort=-rss | grep -Ei '[n]ext|[n]ode|[n]ginx|[p]ostgres|[p]m2|[d]ocker' || true

section 'VARIABLES: PRESENCE UNIQUEMENT'
for environment_file in /etc/synaura/*.env; do
  [[ -f "$environment_file" ]] || continue
  awk -F= -v file="$environment_file" '
    /^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=/ {
      name=$1; gsub(/[[:space:]]/, "", name);
      value=substr($0, index($0, "=")+1); gsub(/^[[:space:]]+|[[:space:]]+$/, "", value);
      printf "%s %s %s\n", file, name, (length(value) ? "PRESENT" : "VIDE");
    }
  ' "$environment_file"
done

section 'PORTS ET PARE-FEU'
if available ss; then ss -lntup || ss -lnt; fi
if available ufw; then ufw status verbose || true; fi
if available nft; then nft list ruleset 2>/dev/null || printf 'nft requiert des privileges\n'; fi

section 'NGINX ET TLS (LIGNES NON SECRETES)'
grep -RInsE '^[[:space:]]*(listen|server_name|proxy_pass|proxy_set_header|ssl_certificate|root|alias|access_log|error_log|add_header|client_max_body_size)' \
  /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true
if available openssl; then
  for certificate in /etc/letsencrypt/live/*/cert.pem; do
    [[ -r "$certificate" ]] || continue
    printf '%s\n' "$certificate"
    openssl x509 -in "$certificate" -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null || true
  done
fi

section 'POSTGRESQL'
if available pg_lsclusters; then pg_lsclusters || true; fi
if available systemctl; then systemctl status postgresql --no-pager 2>/dev/null | sed -n '1,30p' || true; fi
if available psql && sudo -n -u postgres true 2>/dev/null; then
  audit_sql="${1:-}"
  if [[ -n "$audit_sql" && -r "$audit_sql" ]]; then
    sudo -n -u postgres psql -X -p "$postgres_port" -d "$postgres_database" \
      --set=ON_ERROR_STOP=1 --file="$audit_sql"
  else
    sudo -n -u postgres psql -X -p "$postgres_port" -d "$postgres_database" -Atc \
      'select version(); select current_database(), current_user;' || true
    printf 'Passer infra/postgres/audit.sql en argument pour le catalogue complet.\n'
  fi
else
  printf 'Audit catalogue indisponible sans acces psql local autorise.\n'
fi

section 'MONTAGES, MEDIAS ET DISQUES'
findmnt -T /mnt/Synaura-SSD 2>/dev/null || true
findmnt -T /mnt/Synaura-SSD/apps/synaura/media 2>/dev/null || true
df -hT / /mnt/Synaura-SSD /mnt/Synaura-SSD/apps/synaura/media 2>/dev/null || true
namei -l /mnt/Synaura-SSD/apps/synaura/media 2>/dev/null || true
if [[ -d /mnt/Synaura-SSD/apps/synaura/media ]]; then
  find /mnt/Synaura-SSD/apps/synaura/media -mindepth 1 -maxdepth 2 -type d -printf '%M %u:%g %p\n' 2>/dev/null | sort
  du -sh /mnt/Synaura-SSD/apps/synaura/media 2>/dev/null || true
fi

section 'SAUVEGARDES ET JOURNAUX'
find /etc/systemd/system /lib/systemd/system /etc/cron.d /etc/logrotate.d -maxdepth 2 -type f \
  -printf '%M %u:%g %s %p\n' 2>/dev/null | grep -Ei 'synaura|backup|postgres|nginx|certbot' || true
if available journalctl; then
  journalctl --disk-usage || true
  systemctl --failed --no-pager 2>/dev/null || true
fi

section 'REDEMARRAGES ET INCIDENTS'
last -x reboot shutdown | head -n 30 || true
if available journalctl; then
  journalctl --list-boots --no-pager | tail -n 20 || true
  journalctl -k --no-pager 2>/dev/null | grep -Ei 'oom|out of memory|killed process|segfault|i/o error|filesystem|ext4|btrfs|xfs' | tail -n 100 || true
fi

printf '\nAUDIT READ-ONLY TERMINE\n'
