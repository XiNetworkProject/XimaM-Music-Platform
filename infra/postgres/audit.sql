\set ON_ERROR_STOP on
\pset pager off
\timing off

\echo '=== IDENTITE ET VERSION ==='
select version(), current_database(), current_user, session_user;

\echo '=== REGLAGES NON SECRETS ==='
select name, setting, unit, source
from pg_settings
where name in (
  'listen_addresses', 'port', 'max_connections', 'ssl', 'password_encryption',
  'log_destination', 'logging_collector', 'log_connections',
  'log_disconnections', 'log_min_duration_statement', 'shared_buffers'
)
order by name;

\echo '=== ROLES ET CAPACITES ==='
select rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
       rolreplication, rolbypassrls, rolconnlimit
from pg_roles
order by rolname;

\echo '=== HERITAGE DES ROLES ==='
select member.rolname as member, parent.rolname as inherited_role,
       membership.admin_option
from pg_auth_members membership
join pg_roles parent on parent.oid = membership.roleid
join pg_roles member on member.oid = membership.member
order by member.rolname, parent.rolname;

\echo '=== BASES, TAILLES ET CONNEXIONS ==='
select datname, pg_size_pretty(pg_database_size(datname)) as size,
       datallowconn, datconnlimit
from pg_database
order by pg_database_size(datname) desc;

select datname, numbackends, xact_commit, xact_rollback,
       blks_read, blks_hit, deadlocks, temp_files,
       pg_size_pretty(temp_bytes) as temp_bytes
from pg_stat_database
order by datname;

\echo '=== EXTENSIONS ==='
select extname, extversion, nspname as schema
from pg_extension
join pg_namespace on pg_namespace.oid = extnamespace
order by extname;

\echo '=== TABLES, PROPRIETAIRES, RLS ET TAILLES ==='
select namespace.nspname as schema, relation.relname as table,
       owner.rolname as owner, relation.relrowsecurity as rls_enabled,
       relation.relforcerowsecurity as rls_forced,
       pg_size_pretty(pg_total_relation_size(relation.oid)) as total_size,
       coalesce(stats.n_live_tup, 0) as estimated_rows,
       coalesce(stats.n_dead_tup, 0) as dead_rows
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
join pg_roles owner on owner.oid = relation.relowner
left join pg_stat_user_tables stats on stats.relid = relation.oid
where relation.relkind in ('r', 'p')
  and namespace.nspname not in ('pg_catalog', 'information_schema')
order by pg_total_relation_size(relation.oid) desc;

\echo '=== POLITIQUES RLS REELLES ==='
select schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
from pg_policies
order by schemaname, tablename, policyname;

\echo '=== SYNTHESE RLS PUBLIC ==='
select count(*) filter (where relation.relrowsecurity) as rls_enabled,
       count(*) filter (where not relation.relrowsecurity) as rls_disabled,
       count(*) filter (where relation.relforcerowsecurity) as rls_forced,
       count(*) as public_tables
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
where relation.relkind in ('r', 'p')
  and namespace.nspname = 'public';

\echo '=== TABLES EXPOSEES SANS RLS ==='
select table_schema, table_name
from information_schema.tables
where table_type = 'BASE TABLE'
  and table_schema = 'public'
  and not exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = table_schema
      and relation.relname = table_name
      and relation.relrowsecurity
  )
order by table_name;

\echo '=== PRIVILEGES EFFECTIFS DU ROLE SYNAURA ==='
select count(*) filter (where has_table_privilege('synaura_app', relation.oid, 'SELECT')) as can_select,
       count(*) filter (where has_table_privilege('synaura_app', relation.oid, 'INSERT')) as can_insert,
       count(*) filter (where has_table_privilege('synaura_app', relation.oid, 'UPDATE')) as can_update,
       count(*) filter (where has_table_privilege('synaura_app', relation.oid, 'DELETE')) as can_delete,
       count(*) as public_tables
from pg_class relation
join pg_namespace namespace on namespace.oid = relation.relnamespace
where relation.relkind in ('r', 'p')
  and namespace.nspname = 'public';

\echo '=== PRIVILEGES TABLES DES ROLES APPLICATIFS ==='
select grantee, table_schema, table_name, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema not in ('pg_catalog', 'information_schema')
order by grantee, table_schema, table_name, privilege_type;

\echo '=== INDEX ET INDEX INUTILISES (INDICATIF) ==='
select schemaname, relname as table, indexrelname as index,
       idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) as index_size
from pg_stat_user_indexes
order by idx_scan asc, pg_relation_size(indexrelid) desc;

\echo '=== FONCTIONS AUTH LEGACY ==='
select namespace.nspname as schema, procedure.proname,
       pg_get_function_identity_arguments(procedure.oid) as arguments,
       owner.rolname as owner,
       procedure.prosecdef as security_definer,
       procedure.proacl
from pg_proc procedure
join pg_namespace namespace on namespace.oid = procedure.pronamespace
join pg_roles owner on owner.oid = procedure.proowner
where namespace.nspname = 'auth'
   or procedure.prosecdef
order by namespace.nspname, procedure.proname;

\echo '=== DEFINITIONS AUTH UID ET ROLE ==='
select pg_get_functiondef('auth.uid()'::regprocedure);
select pg_get_functiondef('auth.role()'::regprocedure);

\echo '=== COMPORTEMENT AUTH DU ROLE APPLICATIF SANS CLAIMS ==='
begin read only;
set local role synaura_app;
select current_user, auth.uid(), auth.role(),
       current_setting('request.jwt.claims', true) as claims;
rollback;

\echo '=== VUES ET MODE DE SECURITE ==='
select schemaname, viewname, viewowner, definition
from pg_views
where schemaname not in ('pg_catalog', 'information_schema')
order by schemaname, viewname;

\echo '=== CONNEXIONS ACTIVES (REQUETES MASQUEES) ==='
select datname, usename, application_name, client_addr, state,
       count(*) as connections
from pg_stat_activity
group by datname, usename, application_name, client_addr, state
order by connections desc;
