-- Global roles referenced by the production schema dump.
--
-- These are deliberately least-privilege NOLOGIN placeholders. PostgreSQL roles
-- are cluster-global and are not part of pg_dump --schema-only. Production role
-- attributes (including synaura_app LOGIN BYPASSRLS) are documented separately
-- and MUST be provisioned out-of-band with secrets kept outside Git.
-- Existing roles are never altered by this bootstrap.

DO $bootstrap_roles$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY[
    'anon',
    'authenticated',
    'dashboard_user',
    'pgbouncer',
    'service_role',
    'supabase_admin',
    'supabase_auth_admin',
    'supabase_realtime_admin',
    'supabase_storage_admin',
    'synaura_app'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', role_name);
    END IF;
  END LOOP;
END
$bootstrap_roles$;
