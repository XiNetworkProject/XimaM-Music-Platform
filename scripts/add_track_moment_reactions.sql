-- Réactions rapides horodatées (emoji prédéfinis) sur un moment précis d'un morceau.
-- Complète les commentaires horodatés (voir scripts/create_track_waveforms.sql) sans
-- les remplacer : entité dédiée, plus légère (pas de texte, pas de fil de discussion),
-- pensée pour un agrégat visuel groupé sur la waveform ("🔥 46 réactions").

create table if not exists public.track_moment_reactions (
  id uuid primary key default gen_random_uuid(),
  track_id text not null,
  user_id uuid not null,
  reaction_type text not null check (reaction_type in ('drop', 'emotional', 'mindblown', 'favorite', 'vocals', 'production')),
  timestamp_seconds numeric not null check (timestamp_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists track_moment_reactions_track_idx
  on public.track_moment_reactions (track_id, timestamp_seconds);

-- Un utilisateur ne pose qu'une fois la même réaction à la même seconde (évite le
-- doublon d'un double-clic) ; rien n'empêche de réagir à plusieurs instants
-- différents, ou avec plusieurs réactions différentes au même instant.
-- `timestamp_seconds` est arrondi à la seconde par l'API avant insertion, donc cet
-- index unique porte directement sur la colonne (pas besoin d'index d'expression).
create unique index if not exists track_moment_reactions_unique_user_moment
  on public.track_moment_reactions (track_id, user_id, reaction_type, timestamp_seconds);

alter table public.track_moment_reactions enable row level security;
-- Aucune policy anon/authenticated : lecture/écriture uniquement via supabaseAdmin
-- (app/api/tracks/[id]/reactions), même logique que track_waveforms/music_clips.
