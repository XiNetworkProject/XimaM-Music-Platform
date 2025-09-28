-- Analytics schema for tracks and artists
-- Tables: track_events + indexes
-- Views: track_stats_daily, track_stats_rolling_30d

-- Create enum for event types (optional). If enums are inconvenient, fall back to text + CHECK.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'track_event_type') THEN
    CREATE TYPE track_event_type AS ENUM (
      'view',            -- impression (card visible)
      'play_start',
      'play_progress',   -- milestone progress events, e.g. 25/50/75
      'play_complete',   -- ended
      'like',
      'unlike',
      'share',
      'favorite',
      'unfavorite',
      'skip',
      'next',
      'prev',
      'add_to_playlist'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.track_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  track_id        text NOT NULL,
  artist_id       uuid NULL,
  user_id         uuid NULL,
  session_id      text NULL,
  event_type      track_event_type NOT NULL,
  position_ms     integer NULL,            -- playback position when event fired
  duration_ms     integer NULL,            -- duration listened (best-effort)
  progress_pct    numeric(5,2) NULL,       -- 0.00..100.00 for milestone progress
  source          text NULL,               -- home|discover|ai-library|deep-link|profile|search|community|other
  referrer        text NULL,
  platform        text NULL,               -- web|android|ios|desktop
  country         text NULL,
  is_ai_track     boolean NOT NULL DEFAULT false,
  extra           jsonb NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_track_events_track ON public.track_events (track_id);
CREATE INDEX IF NOT EXISTS idx_track_events_created ON public.track_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_events_user ON public.track_events (user_id);
CREATE INDEX IF NOT EXISTS idx_track_events_type ON public.track_events (event_type);

-- Daily aggregated stats per track
CREATE OR REPLACE VIEW public.track_stats_daily AS
SELECT
  track_id,
  is_ai_track,
  (created_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(*) FILTER (WHERE event_type = 'view')                         AS views,
  COUNT(*) FILTER (WHERE event_type = 'play_start')                   AS plays,
  COUNT(*) FILTER (WHERE event_type = 'play_complete')                AS completes,
  COUNT(*) FILTER (WHERE event_type = 'like')                         AS likes,
  COUNT(*) FILTER (WHERE event_type = 'share')                        AS shares,
  COUNT(*) FILTER (WHERE event_type = 'favorite')                     AS favorites,
  COALESCE(SUM(duration_ms) FILTER (WHERE event_type IN ('play_start','play_progress','play_complete')), 0) AS total_listen_ms,
  COUNT(DISTINCT COALESCE(user_id::text, session_id))                 AS unique_listeners,
  -- Simple retention approximations based on completed plays
  CASE WHEN COUNT(*) FILTER (WHERE event_type = 'play_start') > 0
       THEN ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'play_complete') 
                  / NULLIF(COUNT(*) FILTER (WHERE event_type = 'play_start'),0), 2)
       ELSE 0 END                                                     AS retention_complete_rate
FROM public.track_events
GROUP BY 1,2,3;

-- Rolling 30-day stats per track
CREATE OR REPLACE VIEW public.track_stats_rolling_30d AS
SELECT
  track_id,
  is_ai_track,
  MIN(created_at)::date                                  AS first_event_date,
  MAX(created_at)::date                                  AS last_event_date,
  COUNT(*) FILTER (WHERE event_type = 'view')            AS views_30d,
  COUNT(*) FILTER (WHERE event_type = 'play_start')      AS plays_30d,
  COUNT(*) FILTER (WHERE event_type = 'play_complete')   AS completes_30d,
  COUNT(*) FILTER (WHERE event_type = 'like')            AS likes_30d,
  COUNT(*) FILTER (WHERE event_type = 'share')           AS shares_30d,
  COUNT(*) FILTER (WHERE event_type = 'favorite')        AS favorites_30d,
  COALESCE(SUM(duration_ms) FILTER (WHERE event_type IN ('play_start','play_progress','play_complete')), 0) AS listen_ms_30d,
  COUNT(DISTINCT COALESCE(user_id::text, session_id))    AS unique_listeners_30d,
  CASE WHEN COUNT(*) FILTER (WHERE event_type = 'play_start') > 0
       THEN ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'play_complete') 
                  / NULLIF(COUNT(*) FILTER (WHERE event_type = 'play_start'),0), 2)
       ELSE 0 END                                        AS retention_complete_rate_30d
FROM public.track_events
WHERE created_at >= now() - interval '30 days'
GROUP BY 1,2;

-- Optional helper: per-source traffic breakdown for last 30 days
CREATE OR REPLACE VIEW public.track_traffic_sources_30d AS
SELECT
  track_id,
  source,
  COUNT(*) FILTER (WHERE event_type = 'view')          AS views,
  COUNT(*) FILTER (WHERE event_type = 'play_start')    AS plays,
  COUNT(*) FILTER (WHERE event_type = 'play_complete') AS completes
FROM public.track_events
WHERE created_at >= now() - interval '30 days'
GROUP BY 1,2;

-- Note:
-- For high throughput, consider partitioning track_events by month and replacing the views with materialized views + a cron refresh.


