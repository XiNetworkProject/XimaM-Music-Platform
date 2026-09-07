\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;
SET LOCAL enable_seqscan = off;

EXPLAIN (COSTS OFF)
SELECT *
FROM public.active_artist_boosts
WHERE user_id = (SELECT user_id FROM public.active_artist_boosts LIMIT 1)
  AND expires_at > now();

EXPLAIN (COSTS OFF)
SELECT *
FROM public.active_track_boosts
WHERE user_id = (SELECT user_id FROM public.active_track_boosts LIMIT 1)
  AND expires_at > now();

EXPLAIN (COSTS OFF)
SELECT *
FROM public.playlist_tracks
WHERE track_id = (SELECT track_id FROM public.playlist_tracks LIMIT 1);

EXPLAIN (COSTS OFF)
SELECT *
FROM public.playlists
WHERE creator_id = (SELECT creator_id FROM public.playlists LIMIT 1)
ORDER BY created_at DESC;

ROLLBACK;
