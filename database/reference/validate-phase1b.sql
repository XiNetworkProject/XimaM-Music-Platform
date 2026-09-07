\set ON_ERROR_STOP on
\pset pager off

DO $$
DECLARE
  missing text;
BEGIN
  IF to_regclass('public.admin_email_campaigns') IS NULL THEN
    RAISE EXCEPTION 'admin_email_campaigns absente';
  END IF;

  SELECT string_agg(expected.index_name, ', ' ORDER BY expected.index_name)
  INTO missing
  FROM (VALUES
    ('admin_email_campaigns_admin_id_idx'),
    ('admin_email_campaigns_created_at_idx'),
    ('idx_active_artist_boosts_user_expires'),
    ('idx_active_track_boosts_user_expires'),
    ('idx_playlist_tracks_track'),
    ('idx_playlists_creator_created')
  ) AS expected(index_name)
  WHERE to_regclass('public.' || expected.index_name) IS NULL;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Indexes absents: %', missing; END IF;
END;
$$;

DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT count(*)
  INTO invalid_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND p.proname IN (
      'ai_add_credits', 'ai_debit_credits', 'check_user_quota',
      'get_monthly_generations_count', 'get_user_ai_stats',
      'get_user_quota_remaining', 'increment_ai_usage',
      'record_track_view', 'toggle_track_like'
    )
    AND (
      NOT (COALESCE(p.proconfig, '{}') @> ARRAY['search_path=pg_catalog, public'])
      OR has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      OR NOT has_function_privilege('synaura_app', p.oid, 'EXECUTE')
    );
  IF invalid_count <> 0 THEN
    RAISE EXCEPTION '% fonctions SECURITY DEFINER ont un contrat invalide', invalid_count;
  END IF;
END;
$$;

SELECT version, name
FROM synaura_private.schema_migrations
ORDER BY version;
