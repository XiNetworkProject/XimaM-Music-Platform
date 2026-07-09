-- Ajoute le lien vers le défi musical (music_challenges) sur les variations IA
-- en cours de création. Nécessaire pour corriger le bug : une variation générée
-- dans le cadre d'un défi mais partant en attente d'approbation ne comptait
-- jamais comme participation une fois approuvée, faute de savoir à quel défi
-- elle appartenait au moment de la décision (app/api/remixes/[id]/decision).
-- Additif, ne touche à aucune donnée existante (les lignes déjà présentes
-- auront challenge_id = null, comme avant ce correctif).
alter table public.track_remixes
  add column if not exists challenge_id uuid references public.music_challenges(id) on delete set null;

create index if not exists track_remixes_challenge_idx
  on public.track_remixes (challenge_id)
  where challenge_id is not null;
