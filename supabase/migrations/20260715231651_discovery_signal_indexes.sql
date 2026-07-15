create index if not exists idx_track_events_user_created_signal
  on public.track_events (user_id, created_at desc)
  include (track_id, event_type, progress_pct, position_ms, duration_ms)
  where user_id is not null;

create index if not exists idx_track_events_track_created_signal
  on public.track_events (track_id, created_at desc)
  include (event_type, user_id, session_id, progress_pct);
