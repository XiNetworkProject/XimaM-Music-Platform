\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;

SELECT
  ts.track_id,
  ts.likes_count,
  ts.views_count,
  ts.updated_at,
  EXISTS (SELECT 1 FROM public.ai_tracks ai WHERE ai.id::text = ts.track_id OR 'ai-' || ai.id::text = ts.track_id) AS matches_ai_track,
  (SELECT count(*) FROM public.track_events e WHERE e.track_id = ts.track_id) AS event_count,
  (SELECT count(*) FROM public.track_views v WHERE v.track_id = ts.track_id) AS view_rows,
  (SELECT count(*) FROM public.track_likes l WHERE l.track_id = ts.track_id) AS like_rows,
  (SELECT count(*) FROM public.comments c WHERE c.track_id = ts.track_id) AS comment_rows,
  (SELECT count(*) FROM public.playlist_tracks p WHERE p.track_id = ts.track_id) AS playlist_rows
FROM public.track_stats ts
LEFT JOIN public.tracks t ON t.id = ts.track_id
WHERE t.id IS NULL
ORDER BY ts.track_id;

SELECT
  b.id,
  b.track_id,
  b.user_id,
  b.source,
  b.expires_at,
  t.id IS NOT NULL AS matches_track,
  ai.id IS NOT NULL AS matches_ai_track,
  generation.status AS generation_status,
  generation.user_id = b.user_id AS owner_matches
FROM public.active_track_boosts b
LEFT JOIN public.tracks t ON t.id = b.track_id
LEFT JOIN public.ai_tracks ai
  ON ai.id::text = b.track_id OR 'ai-' || ai.id::text = b.track_id
LEFT JOIN public.ai_generations generation ON generation.id = ai.generation_id
WHERE t.id IS NULL
ORDER BY b.id;

COMMIT;
