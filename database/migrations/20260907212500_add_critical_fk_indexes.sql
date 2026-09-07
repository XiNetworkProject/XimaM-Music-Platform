-- Objectif: indexer quatre FK utilisees comme filtres runtime frequents.
-- Preconditions: aucun index valide ne commence par ces colonnes en production.
-- Verrou/volume: tables de 7 a 132 lignes au diagnostic; creation transactionnelle
-- choisie plutot que CONCURRENTLY, avec lock_timeout=5s impose par le runner.
-- Validation: presence/catalogue et EXPLAIN sur les quatre chemins cibles.
-- Retour: DROP INDEX des quatre index ci-dessous; aucune donnee modifiee.

CREATE INDEX idx_active_artist_boosts_user_expires
  ON public.active_artist_boosts (user_id, expires_at DESC);

CREATE INDEX idx_active_track_boosts_user_expires
  ON public.active_track_boosts (user_id, expires_at DESC);

CREATE INDEX idx_playlist_tracks_track
  ON public.playlist_tracks (track_id);

CREATE INDEX idx_playlists_creator_created
  ON public.playlists (creator_id, created_at DESC);
