\set ON_ERROR_STOP on

DO $validation$
DECLARE
  public_tables integer;
  all_tables integer;
  index_count integer;
  constraint_count integer;
  policy_count integer;
  critical_count integer;
BEGIN
  SELECT count(*) INTO public_tables
  FROM pg_class relation JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public' AND relation.relkind = 'r';

  SELECT count(*) INTO all_tables
  FROM pg_class relation JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast'
    AND relation.relkind IN ('r', 'p');

  SELECT count(*) INTO index_count
  FROM pg_index idx JOIN pg_class relation ON relation.oid = idx.indrelid
  JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast';

  SELECT count(*) INTO constraint_count
  FROM pg_constraint constraint_object
  JOIN pg_class relation ON relation.oid = constraint_object.conrelid
  JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast';

  SELECT count(*) INTO policy_count FROM pg_policies;

  SELECT count(*) INTO critical_count
  FROM pg_class relation JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relkind = 'r'
    AND relation.relname IN (
      'profiles', 'tracks', 'track_waveforms', 'track_likes', 'comments',
      'playlists', 'messages', 'notifications', 'ai_generations', 'ai_tracks',
      'user_follows'
    );

  IF public_tables <> 95 OR all_tables <> 137 OR index_count <> 458
     OR constraint_count <> 471 OR policy_count <> 157 OR critical_count <> 11 THEN
    RAISE EXCEPTION 'Baseline incomplete: public=%, all=%, indexes=%, constraints=%, policies=%, critical=%',
      public_tables, all_tables, index_count, constraint_count, policy_count, critical_count;
  END IF;
END
$validation$;

SELECT 'baseline_valid' AS result;
