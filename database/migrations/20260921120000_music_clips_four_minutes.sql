-- Local candidate only: expand the existing clip-duration contract to 4 minutes.
-- No data rewrite, no permissions change. Run with the canonical migration runner.
-- The migration runner owns the transaction; lock_timeout bounds lock acquisition.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.music_clips DROP CONSTRAINT music_clips_duration_check;
ALTER TABLE public.music_clips ADD CONSTRAINT music_clips_duration_check
  CHECK (source_track_duration_seconds BETWEEN 15 AND 240) NOT VALID;
ALTER TABLE public.music_clips VALIDATE CONSTRAINT music_clips_duration_check;
-- Rollback only if SELECT count(*) FROM public.music_clips
-- WHERE source_track_duration_seconds > 60 returns zero. Never delete/truncate clips.
