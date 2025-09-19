-- Ajout des colonnes d'audience sur track_views
alter table if exists public.track_views
  add column if not exists country text,
  add column if not exists device text,
  add column if not exists user_agent text,
  add column if not exists ip inet;

-- Index utiles pour agrégations
create index if not exists idx_track_views_country on public.track_views(country);
create index if not exists idx_track_views_device on public.track_views(device);


