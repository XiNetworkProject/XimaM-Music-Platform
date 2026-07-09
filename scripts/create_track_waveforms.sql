-- Waveform interactive + commentaires horodatés (signature Synaura).
-- Cache des peaks audio réels (générés côté client via Web Audio API, jamais de
-- données aléatoires) pour éviter de redécoder le fichier à chaque ouverture, et
-- lien commentaire -> instant précis du morceau.

-- ── Cache de waveform ───────────────────────────────────────────
create table if not exists public.track_waveforms (
  track_id text not null,
  track_type text not null default 'track' check (track_type in ('track', 'ai_track')),
  duration numeric not null check (duration > 0),
  peaks jsonb not null,
  created_at timestamptz not null default now(),
  primary key (track_id, track_type)
);

alter table public.track_waveforms enable row level security;
-- Aucune policy anon/authenticated : lecture/écriture uniquement via
-- supabaseAdmin (app/api/tracks/[id]/waveform), même logique que les autres
-- tables verrouillées (music_challenges, music_clips, creator_posts). Les
-- peaks ne sont pas sensibles en soi, mais on garde une seule source de
-- vérité (l'API) plutôt qu'un accès REST direct non validé.

-- ── Commentaires horodatés ──────────────────────────────────────
-- Réutilise la table comments existante (id, track_id, user_id, content,
-- created_at, parent_id...) plutôt que de dupliquer likes/modération/
-- notifications déjà câblés dessus. NULL = commentaire classique (comportement
-- inchangé), une valeur = commentaire ancré à un instant du morceau.
alter table public.comments
  add column if not exists timestamp_seconds numeric check (timestamp_seconds is null or timestamp_seconds >= 0);

create index if not exists comments_track_timestamp_idx
  on public.comments (track_id, timestamp_seconds)
  where timestamp_seconds is not null;
