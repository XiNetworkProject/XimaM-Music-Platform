-- Ajouter les champs pour stocker les public_id Cloudinary des images de profil
-- Cela permet de supprimer automatiquement les anciennes images lors du changement

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS avatar_public_id TEXT,
  ADD COLUMN IF NOT EXISTS banner_public_id TEXT;

-- Ajouter des commentaires pour documenter ces champs
COMMENT ON COLUMN public.profiles.avatar_public_id IS 'Public ID Cloudinary de l''avatar pour suppression automatique';
COMMENT ON COLUMN public.profiles.banner_public_id IS 'Public ID Cloudinary de la bannière pour suppression automatique';
