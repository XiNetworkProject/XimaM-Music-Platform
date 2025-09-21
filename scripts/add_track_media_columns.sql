-- Ajout idempotent des colonnes nécessaires pour l'upload (Cloudinary + quotas)
-- À exécuter dans Supabase (SQL Editor)

-- Colonnes d’identifiants Cloudinary
alter table if exists public.tracks
  add column if not exists audio_public_id text,
  add column if not exists cover_public_id text;

-- Colonnes de taille (pour calcul du stockage)
alter table if exists public.tracks
  add column if not exists audio_size_mb numeric,
  add column if not exists cover_size_mb numeric;

-- Optionnel: index utile déjà présent en général
-- create index if not exists tracks_creator_id_idx on public.tracks(creator_id);

comment on column public.tracks.audio_public_id is 'Public ID Cloudinary du fichier audio (resource_type=video)';
comment on column public.tracks.cover_public_id is 'Public ID Cloudinary de l\'image de couverture (resource_type=image)';
comment on column public.tracks.audio_size_mb is 'Taille du fichier audio en mégaoctets (approx)';
comment on column public.tracks.cover_size_mb is 'Taille de l\'image de couverture en mégaoctets (approx)';


