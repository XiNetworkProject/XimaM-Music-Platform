\set ON_ERROR_STOP on
\pset pager off
\pset format csv
\pset footer off

BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '2s';

\echo __SECTION__database
SELECT current_database() AS database_name,
       pg_get_userbyid(datdba) AS owner,
       pg_encoding_to_char(encoding) AS encoding,
       datcollate AS collate,
       datctype AS ctype
FROM pg_database
WHERE datname = current_database();

\echo __SECTION__schemas
SELECT n.nspname AS schema_name,
       pg_get_userbyid(n.nspowner) AS owner,
       n.nspacl::text AS acl
FROM pg_namespace n
WHERE n.nspname !~ '^pg_toast'
  AND n.nspname !~ '^pg_temp'
ORDER BY n.nspname;

\echo __SECTION__relations
SELECT n.nspname AS schema_name,
       c.relname AS relation_name,
       CASE c.relkind
         WHEN 'r' THEN 'table'
         WHEN 'p' THEN 'partitioned_table'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized_view'
         WHEN 'S' THEN 'sequence'
         WHEN 'f' THEN 'foreign_table'
         WHEN 'c' THEN 'composite_type'
         ELSE c.relkind::text
       END AS relation_kind,
       pg_get_userbyid(c.relowner) AS owner,
       c.relpersistence AS persistence,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       c.reloptions::text AS relation_options,
       c.reltuples::bigint AS estimated_rows,
       CASE WHEN c.relkind IN ('r','p','m') THEN pg_total_relation_size(c.oid) ELSE NULL END AS total_bytes,
       c.relacl::text AS acl
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname !~ '^pg_toast'
  AND c.relkind IN ('r','p','v','m','S','f','c')
ORDER BY n.nspname, relation_kind, c.relname;

\echo __SECTION__columns
SELECT n.nspname AS schema_name,
       c.relname AS relation_name,
       a.attnum AS ordinal_position,
       a.attname AS column_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
       NOT a.attnotnull AS is_nullable,
       pg_get_expr(d.adbin, d.adrelid) AS column_default,
       a.attidentity AS identity_kind,
       a.attgenerated AS generated_kind
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname !~ '^pg_toast'
  AND c.relkind IN ('r','p','v','m','f')
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY n.nspname, c.relname, a.attnum;

\echo __SECTION__sequences
SELECT n.nspname AS schema_name,
       c.relname AS sequence_name,
       pg_get_userbyid(c.relowner) AS owner,
       format_type(s.seqtypid, NULL) AS data_type,
       s.seqstart AS start_value,
       s.seqincrement AS increment_by,
       s.seqmin AS min_value,
       s.seqmax AS max_value,
       s.seqcache AS cache_size,
       s.seqcycle AS cycles
FROM pg_sequence s
JOIN pg_class c ON c.oid = s.seqrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname;

\echo __SECTION__indexes
SELECT ns.nspname AS schema_name,
       tbl.relname AS table_name,
       idx.relname AS index_name,
       pg_get_userbyid(idx.relowner) AS owner,
       i.indisprimary AS is_primary,
       i.indisunique AS is_unique,
       i.indisvalid AS is_valid,
       i.indisready AS is_ready,
       pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index i
JOIN pg_class idx ON idx.oid = i.indexrelid
JOIN pg_class tbl ON tbl.oid = i.indrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname !~ '^pg_toast'
ORDER BY ns.nspname, tbl.relname, idx.relname;

\echo __SECTION__constraints
SELECT ns.nspname AS schema_name,
       tbl.relname AS table_name,
       con.conname AS constraint_name,
       CASE con.contype
         WHEN 'p' THEN 'primary_key'
         WHEN 'u' THEN 'unique'
         WHEN 'f' THEN 'foreign_key'
         WHEN 'c' THEN 'check'
         WHEN 'x' THEN 'exclusion'
         ELSE con.contype::text
       END AS constraint_type,
       pg_get_constraintdef(con.oid, true) AS definition,
       con.convalidated AS is_validated,
       con.condeferrable AS is_deferrable,
       con.condeferred AS initially_deferred
FROM pg_constraint con
JOIN pg_class tbl ON tbl.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname !~ '^pg_toast'
ORDER BY ns.nspname, tbl.relname, constraint_type, con.conname;

\echo __SECTION__triggers
SELECT ns.nspname AS schema_name,
       tbl.relname AS table_name,
       trg.tgname AS trigger_name,
       trg.tgenabled AS enabled_mode,
       pns.nspname AS function_schema,
       proc.proname AS function_name,
       pg_get_triggerdef(trg.oid, true) AS definition
FROM pg_trigger trg
JOIN pg_class tbl ON tbl.oid = trg.tgrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
JOIN pg_proc proc ON proc.oid = trg.tgfoid
JOIN pg_namespace pns ON pns.oid = proc.pronamespace
WHERE NOT trg.tgisinternal
  AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname !~ '^pg_toast'
ORDER BY ns.nspname, tbl.relname, trg.tgname;

\echo __SECTION__routines
SELECT ns.nspname AS schema_name,
       proc.proname AS routine_name,
       pg_get_function_identity_arguments(proc.oid) AS identity_arguments,
       CASE proc.prokind WHEN 'p' THEN 'procedure' WHEN 'a' THEN 'aggregate' WHEN 'w' THEN 'window' ELSE 'function' END AS routine_kind,
       pg_get_function_result(proc.oid) AS result_type,
       lang.lanname AS language,
       proc.provolatile AS volatility,
       proc.prosecdef AS security_definer,
       proc.proleakproof AS leakproof,
       proc.proisstrict AS strict,
       proc.proconfig::text AS runtime_config,
       pg_get_userbyid(proc.proowner) AS owner,
       proc.proacl::text AS acl
FROM pg_proc proc
JOIN pg_namespace ns ON ns.oid = proc.pronamespace
JOIN pg_language lang ON lang.oid = proc.prolang
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname !~ '^pg_toast'
ORDER BY ns.nspname, proc.proname, identity_arguments;

\echo __SECTION__extensions
SELECT ext.extname AS extension_name,
       ext.extversion AS version,
       ns.nspname AS schema_name,
       pg_get_userbyid(ext.extowner) AS owner,
       ext.extrelocatable AS relocatable
FROM pg_extension ext
JOIN pg_namespace ns ON ns.oid = ext.extnamespace
ORDER BY ext.extname;

\echo __SECTION__types
SELECT ns.nspname AS schema_name,
       typ.typname AS type_name,
       CASE typ.typtype WHEN 'e' THEN 'enum' WHEN 'd' THEN 'domain' WHEN 'c' THEN 'composite' WHEN 'r' THEN 'range' WHEN 'm' THEN 'multirange' ELSE typ.typtype::text END AS type_kind,
       pg_get_userbyid(typ.typowner) AS owner,
       format_type(typ.typbasetype, typ.typtypmod) AS base_type,
       typ.typnotnull AS not_null,
       pg_get_expr(typ.typdefaultbin, 0) AS default_expression,
       (SELECT string_agg(enum.enumlabel, ' | ' ORDER BY enum.enumsortorder)
        FROM pg_enum enum
        WHERE enum.enumtypid = typ.oid) AS enum_values,
       typ.typacl::text AS acl
FROM pg_type typ
JOIN pg_namespace ns ON ns.oid = typ.typnamespace
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname !~ '^pg_toast'
  AND typ.typtype IN ('e','d','c','r','m')
  AND typ.typname !~ '^_'
ORDER BY ns.nspname, typ.typname;

\echo __SECTION__policies
SELECT schemaname AS schema_name,
       tablename AS table_name,
       policyname AS policy_name,
       permissive,
       roles::text AS roles,
       cmd AS command,
       qual AS using_expression,
       with_check AS check_expression
FROM pg_policies
ORDER BY schemaname, tablename, policyname;

\echo __SECTION__relation_acl
SELECT ns.nspname AS schema_name,
       rel.relname AS relation_name,
       grantor.rolname AS grantor,
       COALESCE(grantee.rolname, 'PUBLIC') AS grantee,
       acl.privilege_type,
       acl.is_grantable
FROM pg_class rel
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
CROSS JOIN LATERAL aclexplode(COALESCE(rel.relacl, acldefault(CASE WHEN rel.relkind = 'S' THEN 'S'::"char" ELSE 'r'::"char" END, rel.relowner))) acl
JOIN pg_roles grantor ON grantor.oid = acl.grantor
LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname !~ '^pg_toast'
  AND rel.relkind IN ('r','p','v','m','S','f')
ORDER BY ns.nspname, rel.relname, COALESCE(grantee.rolname, 'PUBLIC'), acl.privilege_type;

\echo __SECTION__routine_acl
SELECT ns.nspname AS schema_name,
       proc.proname AS routine_name,
       pg_get_function_identity_arguments(proc.oid) AS identity_arguments,
       grantor.rolname AS grantor,
       COALESCE(grantee.rolname, 'PUBLIC') AS grantee,
       acl.privilege_type,
       acl.is_grantable
FROM pg_proc proc
JOIN pg_namespace ns ON ns.oid = proc.pronamespace
CROSS JOIN LATERAL aclexplode(COALESCE(proc.proacl, acldefault('f', proc.proowner))) acl
JOIN pg_roles grantor ON grantor.oid = acl.grantor
LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname !~ '^pg_toast'
ORDER BY ns.nspname, proc.proname, identity_arguments, COALESCE(grantee.rolname, 'PUBLIC');

\echo __SECTION__roles
SELECT rolname,
       rolsuper,
       rolinherit,
       rolcreaterole,
       rolcreatedb,
       rolcanlogin,
       rolreplication,
       rolbypassrls,
       rolconnlimit
FROM pg_roles
WHERE rolname !~ '^pg_'
ORDER BY rolname;

\echo __SECTION__role_memberships
SELECT member.rolname AS member,
       role.rolname AS granted_role,
       grantor.rolname AS grantor,
       membership.admin_option,
       membership.inherit_option,
       membership.set_option
FROM pg_auth_members membership
JOIN pg_roles role ON role.oid = membership.roleid
JOIN pg_roles member ON member.oid = membership.member
JOIN pg_roles grantor ON grantor.oid = membership.grantor
ORDER BY member.rolname, role.rolname;

\echo __SECTION__table_stats
SELECT schemaname AS schema_name,
       relname AS table_name,
       seq_scan,
       seq_tup_read,
       idx_scan,
       idx_tup_fetch,
       n_tup_ins,
       n_tup_upd,
       n_tup_del,
       n_live_tup,
       n_dead_tup,
       last_analyze,
       last_autoanalyze
FROM pg_stat_user_tables
ORDER BY schemaname, relname;

\echo __SECTION__index_stats
SELECT stats.schemaname AS schema_name,
       stats.relname AS table_name,
       stats.indexrelname AS index_name,
       stats.idx_scan,
       stats.idx_tup_read,
       stats.idx_tup_fetch,
       pg_relation_size(stats.indexrelid) AS index_bytes
FROM pg_stat_user_indexes stats
ORDER BY stats.schemaname, stats.relname, stats.indexrelname;

\echo __SECTION__unindexed_foreign_keys
SELECT src_ns.nspname AS schema_name,
       src.relname AS table_name,
       con.conname AS constraint_name,
       array_agg(src_att.attname ORDER BY keys.ordinality)::text AS foreign_key_columns,
       target_ns.nspname AS target_schema,
       target.relname AS target_table,
       pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
JOIN pg_class target ON target.oid = con.confrelid
JOIN pg_namespace target_ns ON target_ns.oid = target.relnamespace
JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS keys(attnum, ordinality) ON true
JOIN pg_attribute src_att ON src_att.attrelid = src.oid AND src_att.attnum = keys.attnum
WHERE con.contype = 'f'
  AND src_ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_index idx
    WHERE idx.indrelid = con.conrelid
      AND idx.indisvalid
      AND idx.indisready
      AND (idx.indkey::smallint[])[0:cardinality(con.conkey)-1] = con.conkey
  )
GROUP BY src_ns.nspname, src.relname, con.conname, target_ns.nspname, target.relname, con.oid
ORDER BY src_ns.nspname, src.relname, con.conname;

\echo __SECTION__id_columns_without_fk
SELECT ns.nspname AS schema_name,
       rel.relname AS table_name,
       att.attname AS column_name,
       format_type(att.atttypid, att.atttypmod) AS data_type,
       NOT att.attnotnull AS is_nullable,
       rel.reltuples::bigint AS estimated_rows
FROM pg_attribute att
JOIN pg_class rel ON rel.oid = att.attrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname IN ('public', 'auth')
  AND rel.relkind IN ('r','p')
  AND att.attnum > 0
  AND NOT att.attisdropped
  AND att.attname <> 'id'
  AND att.attname ~ '(^|_)id$'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    WHERE con.conrelid = rel.oid
      AND con.contype = 'f'
      AND att.attnum = ANY(con.conkey)
  )
ORDER BY ns.nspname, rel.relname, att.attname;

\echo __SECTION__duplicate_indexes
SELECT ns.nspname AS schema_name,
       rel.relname AS table_name,
       string_agg(idx_rel.relname, ' | ' ORDER BY idx_rel.relname) AS duplicate_indexes,
       pg_get_indexdef(min(idx.indexrelid::bigint)::oid) AS representative_definition
FROM pg_index idx
JOIN pg_class rel ON rel.oid = idx.indrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
JOIN pg_class idx_rel ON idx_rel.oid = idx.indexrelid
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND ns.nspname !~ '^pg_toast'
GROUP BY ns.nspname, rel.relname, idx.indkey, idx.indclass, idx.indcollation,
         idx.indoption, idx.indexprs, idx.indpred, idx.indisunique
HAVING count(*) > 1
ORDER BY ns.nspname, rel.relname;

\echo __SECTION__integrity_diagnostics
SELECT metric, value
FROM (
  SELECT 'profiles_without_auth_user' AS metric, count(*)::bigint AS value
  FROM public.profiles profile LEFT JOIN auth.users users ON users.id = profile.id
  WHERE users.id IS NULL
  UNION ALL
  SELECT 'auth_users_without_profile', count(*)::bigint
  FROM auth.users users LEFT JOIN public.profiles profile ON profile.id = users.id
  WHERE users.deleted_at IS NULL AND profile.id IS NULL
  UNION ALL
  SELECT 'public_users_without_auth_user', count(*)::bigint
  FROM public.users legacy LEFT JOIN auth.users users ON users.id = legacy.id
  WHERE users.id IS NULL
  UNION ALL
  SELECT 'tracks_creator_user_mismatch', count(*)::bigint
  FROM public.tracks WHERE creator_id IS NOT NULL AND user_id IS NOT NULL AND creator_id <> user_id
  UNION ALL
  SELECT 'tracks_without_creator_id', count(*)::bigint
  FROM public.tracks WHERE creator_id IS NULL
  UNION ALL
  SELECT 'tracks_without_user_id', count(*)::bigint
  FROM public.tracks WHERE user_id IS NULL
  UNION ALL
  SELECT 'tracks_creator_without_profile', count(*)::bigint
  FROM public.tracks track LEFT JOIN public.profiles profile ON profile.id = track.creator_id
  WHERE track.creator_id IS NOT NULL AND profile.id IS NULL
  UNION ALL
  SELECT 'ai_tracks_without_generation', count(*)::bigint
  FROM public.ai_tracks track LEFT JOIN public.ai_generations generation ON generation.id = track.generation_id
  WHERE track.generation_id IS NOT NULL AND generation.id IS NULL
  UNION ALL
  SELECT 'duplicate_user_follow_pairs', count(*)::bigint
  FROM (SELECT follower_id, following_id FROM public.user_follows GROUP BY follower_id, following_id HAVING count(*) > 1) duplicate
  UNION ALL
  SELECT 'duplicate_profiles_username_casefold', count(*)::bigint
  FROM (SELECT lower(username) FROM public.profiles WHERE username IS NOT NULL GROUP BY lower(username) HAVING count(*) > 1) duplicate
  UNION ALL
  SELECT 'duplicate_profiles_email_casefold', count(*)::bigint
  FROM (SELECT lower(email) FROM public.profiles WHERE email IS NOT NULL GROUP BY lower(email) HAVING count(*) > 1) duplicate
  UNION ALL
  SELECT 'track_waveforms_without_track', count(*)::bigint
  FROM public.track_waveforms waveform LEFT JOIN public.tracks track ON track.id = waveform.track_id
  WHERE track.id IS NULL
  UNION ALL
  SELECT 'track_stats_without_track', count(*)::bigint
  FROM public.track_stats stats LEFT JOIN public.tracks track ON track.id = stats.track_id
  WHERE track.id IS NULL
  UNION ALL
  SELECT 'active_track_boosts_without_track', count(*)::bigint
  FROM public.active_track_boosts boost LEFT JOIN public.tracks track ON track.id = boost.track_id
  WHERE track.id IS NULL
  UNION ALL
  SELECT 'push_subscriptions_without_profile', count(*)::bigint
  FROM public.push_subscriptions subscription LEFT JOIN public.profiles profile ON profile.id = subscription.user_id
  WHERE profile.id IS NULL
  UNION ALL
  SELECT 'message_requests_requester_without_profile', count(*)::bigint
  FROM public.message_requests request LEFT JOIN public.profiles profile ON profile.id = request.requester_id
  WHERE profile.id IS NULL
  UNION ALL
  SELECT 'message_requests_target_without_profile', count(*)::bigint
  FROM public.message_requests request LEFT JOIN public.profiles profile ON profile.id = request.target_id
  WHERE profile.id IS NULL
  UNION ALL
  SELECT 'track_moment_reactions_without_content', count(*)::bigint
  FROM public.track_moment_reactions reaction
  LEFT JOIN public.tracks track ON track.id = reaction.track_id
  LEFT JOIN public.ai_tracks ai_track ON ai_track.id::text = reaction.track_id
  WHERE track.id IS NULL AND ai_track.id IS NULL
) diagnostics
ORDER BY metric;

\echo __SECTION__stats_settings
SELECT current_setting('track_counts') AS track_counts,
       current_setting('track_functions') AS track_functions,
       current_setting('shared_preload_libraries') AS shared_preload_libraries,
       stats_reset
FROM pg_stat_database
WHERE datname = current_database();

\echo __SECTION__function_stats
SELECT schemaname AS schema_name,
       funcname AS function_name,
       calls,
       total_time,
       self_time
FROM pg_stat_user_functions
ORDER BY schemaname, funcname;

\echo __SECTION__migration_history_columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations'
  AND table_name = 'schema_migrations'
ORDER BY ordinal_position;

\echo __SECTION__migration_history
SELECT version,
       name,
       cardinality(statements) AS statement_count
FROM supabase_migrations.schema_migrations
ORDER BY version;

ROLLBACK;
