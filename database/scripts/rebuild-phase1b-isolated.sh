#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="${1:-$(pwd)}"
PG_BIN="${PHASE1B_PG_BIN:-/usr/lib/postgresql/17/bin}"
PG_PORT="${PHASE1B_PGPORT:-5433}"
RUN_ID="$(date -u +%Y%m%d%H%M%S)_$$"
DB_NAME="synaura_phase1b_${RUN_ID}"
ROLE_NAME="synaura_phase1b_test_${RUN_ID}"

case "$ROOT_DIR" in
  /*) ;;
  *) echo "ROOT_DIR doit etre absolu" >&2; exit 2 ;;
esac
[[ "$DB_NAME" =~ ^synaura_phase1b_[0-9_]+$ ]] || exit 2
[[ "$ROLE_NAME" =~ ^synaura_phase1b_test_[0-9_]+$ ]] || exit 2

cleanup() {
  "$PG_BIN/dropdb" --if-exists --port "$PG_PORT" "$DB_NAME" >/dev/null 2>&1 || true
  "$PG_BIN/psql" -X --port "$PG_PORT" --dbname postgres --set ON_ERROR_STOP=1 \
    --command "DROP ROLE IF EXISTS \"$ROLE_NAME\"" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$PG_BIN/psql" -X --port "$PG_PORT" --dbname postgres --set ON_ERROR_STOP=1 \
  --command "CREATE ROLE \"$ROLE_NAME\" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS"
"$PG_BIN/createdb" --port "$PG_PORT" "$DB_NAME"

"$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
  --file "$ROOT_DIR/database/baseline/000_prerequisite_roles.sql" >/dev/null
"$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
  --file "$ROOT_DIR/database/baseline/010_production_schema.sql" >/dev/null

PHASE1B_PG_BIN="$PG_BIN" PHASE1B_PGPORT="$PG_PORT" PHASE1B_DATABASE="$DB_NAME" \
  PHASE1B_REGISTER_BASELINE=1 bash "$ROOT_DIR/database/scripts/apply-phase1b-migrations.sh" "$ROOT_DIR"

"$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
  --set phase1b_role="$ROLE_NAME" --file "$ROOT_DIR/database/reference/restricted-role-grants.sql" >/dev/null
"$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
  --file "$ROOT_DIR/database/reference/validate-phase1b.sql"

role_flags="$("$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --tuples-only --no-align \
  --command "SELECT rolcanlogin||'|'||rolsuper||'|'||rolbypassrls FROM pg_roles WHERE rolname='$ROLE_NAME'")"
[[ "$role_flags" == "false|false|false" ]] || { echo "Attributs role inattendus: $role_flags" >&2; exit 1; }

"$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --set ON_ERROR_STOP=1 <<SQL >/dev/null
SET ROLE "$ROLE_NAME";
INSERT INTO public.comment_moderation(comment_id, track_id, creator_id, is_filtered, filter_reason)
VALUES ('11111111-1111-1111-1111-111111111111', 'phase1b-track', '22222222-2222-2222-2222-222222222222', true, 'first')
ON CONFLICT (comment_id, creator_id) DO UPDATE SET filter_reason = EXCLUDED.filter_reason;
INSERT INTO public.comment_moderation(comment_id, track_id, creator_id, is_filtered, filter_reason)
VALUES ('11111111-1111-1111-1111-111111111111', 'phase1b-track', '22222222-2222-2222-2222-222222222222', true, 'second')
ON CONFLICT (comment_id, creator_id) DO UPDATE SET filter_reason = EXCLUDED.filter_reason;
SELECT public.get_user_ai_stats('22222222-2222-2222-2222-222222222222');
RESET ROLE;
DO \$\$
BEGIN
  IF (SELECT count(*) FROM public.comment_moderation WHERE comment_id = '11111111-1111-1111-1111-111111111111') <> 1 THEN
    RAISE EXCEPTION 'upsert comment_moderation non idempotent';
  END IF;
END;
\$\$;
SQL

if "$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
  --command "SET ROLE \"$ROLE_NAME\"; INSERT INTO public.admin_email_campaigns(template,subject,title,message,target) VALUES ('announcement','s','t','m','all')" >/dev/null 2>&1; then
  echo "Le role restreint a contourne RLS sans policy" >&2
  exit 1
fi
echo "RESTRICTED_ROLE_RLS_DENIAL=confirmed"

"$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
  --command "CREATE POLICY phase1b_test_app_role ON public.admin_email_campaigns FOR ALL TO \"$ROLE_NAME\" USING (true) WITH CHECK (true)" >/dev/null
"$PG_BIN/psql" -X --port "$PG_PORT" --dbname "$DB_NAME" --set ON_ERROR_STOP=1 \
  --command "SET ROLE \"$ROLE_NAME\"; INSERT INTO public.admin_email_campaigns(template,subject,title,message,target) VALUES ('announcement','s','t','m','all'); SELECT count(*) FROM public.admin_email_campaigns" >/dev/null
echo "RESTRICTED_ROLE_WITH_EXPLICIT_POLICY=pass"

echo "PHASE1B_TEMP_DATABASE=$DB_NAME"
echo "PHASE1B_TEST_ROLE=$ROLE_NAME"
echo "PHASE1B_RECONSTRUCTION=pass"
