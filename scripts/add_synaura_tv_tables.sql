-- SYNAURA TV (Phase 1, sans replay) — tables de configuration
-- Exécuter dans Supabase SQL Editor

create table if not exists public.synaura_tv_settings (
  id int primary key default 1,
  provider text not null default 'manual',
  enabled boolean not null default false,
  playback_url text,
  rtmp_url text,
  stream_key text,
  mux_live_stream_id text,
  mux_playback_id text,
  updated_at timestamptz not null default now()
);

alter table public.synaura_tv_settings enable row level security;

-- Pas de policy publique: la lecture/écriture se fait via les routes API côté serveur (service role).
-- Si tu veux ouvrir le select côté admin via RLS, ajoute une policy liée à ton système d'auth.

insert into public.synaura_tv_settings (id) values (1)
on conflict (id) do nothing;

