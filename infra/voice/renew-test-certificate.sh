#!/bin/sh
set -eu
[ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/synaura-voice-test ] || exit 0
/usr/sbin/nginx -t
systemctl reload nginx
