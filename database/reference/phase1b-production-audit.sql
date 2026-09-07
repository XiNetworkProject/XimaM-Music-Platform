\set ON_ERROR_STOP on
\pset pager off
\pset null '(null)'
\x off

BEGIN TRANSACTION READ ONLY;

SELECT 'environment' AS section,
       current_database() AS database_name,
       current_user AS audit_role,
       version() AS postgres_version,
       clock_timestamp() AS audited_at;

SELECT 'runtime_objects' AS section,
       requested.object_name,
       COALESCE(c.relkind::text, 'absent') AS relation_kind,
       pg_get_userbyid(c.relowner) AS owner,
       COALESCE(s.n_live_tup, 0) AS estimated_rows
FROM (VALUES
  ('admin_email_campaigns'),
  ('ai_generated_tracks'),
  ('creator_filters'),
  ('follows'),
  ('moderation_actions'),
  ('user_statuses'),
  ('user_subscriptions')
) AS requested(object_name)
LEFT JOIN pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = requested.object_name
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
ORDER BY requested.object_name;

SELECT 'replacement_relations' AS section,
       c.relname AS relation_name,
       c.relkind,
       pg_get_userbyid(c.relowner) AS owner,
       COALESCE(s.n_live_tup, 0) AS estimated_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'ai_tracks', 'creator_comment_filters', 'comment_moderation',
    'subscriptions', 'user_follows'
  )
ORDER BY c.relname;

SELECT 'comment_moderation_duplicates' AS section,
       comment_id,
       creator_id,
       count(*) AS duplicate_count
FROM public.comment_moderation
GROUP BY comment_id, creator_id
HAVING count(*) > 1
ORDER BY duplicate_count DESC, comment_id, creator_id;

SELECT 'comment_moderation_contract' AS section,
       con.conname,
       con.contype,
       pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'comment_moderation'
ORDER BY con.conname;

SELECT 'track_stats_orphans' AS section,
       ts.*
FROM public.track_stats ts
LEFT JOIN public.tracks t ON t.id = ts.track_id
WHERE t.id IS NULL
ORDER BY ts.track_id;

SELECT 'active_track_boost_orphans' AS section,
       atb.*
FROM public.active_track_boosts atb
LEFT JOIN public.tracks t ON t.id = atb.track_id
WHERE t.id IS NULL
ORDER BY atb.track_id;

SELECT 'security_definer' AS section,
       n.nspname AS schema_name,
       p.proname,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       pg_get_userbyid(p.proowner) AS owner,
       p.proconfig AS runtime_config,
       p.proacl AS acl,
       md5(pg_get_functiondef(p.oid)) AS definition_md5
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND COALESCE(array_to_string(p.proconfig, ','), '') NOT LIKE '%search_path=%'
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);

SELECT 'security_definer_shadow_candidates' AS section,
       target.proname,
       pg_get_function_identity_arguments(target.oid) AS target_arguments,
       other_n.nspname AS other_schema,
       pg_get_function_identity_arguments(other.oid) AS other_arguments
FROM pg_proc target
JOIN pg_namespace target_n ON target_n.oid = target.pronamespace
JOIN pg_proc other ON other.proname = target.proname AND other.oid <> target.oid
JOIN pg_namespace other_n ON other_n.oid = other.pronamespace
WHERE target_n.nspname = 'public'
  AND target.prosecdef
  AND COALESCE(array_to_string(target.proconfig, ','), '') NOT LIKE '%search_path=%'
ORDER BY target.proname, other_n.nspname;

SELECT 'public_schema_acl' AS section,
       n.nspacl,
       has_schema_privilege('public', 'CREATE') AS audit_role_can_create,
       EXISTS (
         SELECT 1
         FROM aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) acl
         WHERE acl.grantee = 0 AND acl.privilege_type = 'CREATE'
       ) AS public_can_create
FROM pg_namespace n
WHERE n.nspname = 'public';

SELECT 'unindexed_fk' AS section,
       ns.nspname AS schema_name,
       tbl.relname AS table_name,
       con.conname AS constraint_name,
       pg_get_constraintdef(con.oid, true) AS definition,
       COALESCE(stats.n_live_tup, 0) AS estimated_rows,
       COALESCE(stats.n_tup_ins, 0) AS inserted_rows,
       COALESCE(stats.n_tup_upd, 0) AS updated_rows,
       COALESCE(stats.n_tup_del, 0) AS deleted_rows
FROM pg_constraint con
JOIN pg_class tbl ON tbl.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
LEFT JOIN pg_stat_user_tables stats ON stats.relid = tbl.oid
WHERE con.contype = 'f'
  AND ns.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_index idx
    WHERE idx.indrelid = con.conrelid
      AND idx.indisvalid
      AND (idx.indkey::smallint[])[0:cardinality(con.conkey)-1] = con.conkey
  )
ORDER BY estimated_rows DESC, table_name, constraint_name;

SELECT 'migration_history' AS section,
       version,
       name,
       cardinality(statements) AS statement_count,
       md5(array_to_string(statements, E'\n')) AS statements_md5
FROM supabase_migrations.schema_migrations
ORDER BY version;

COMMIT;
