-- Ajoute la colonne image_public_id pour pouvoir supprimer l'image Cloudinary à la suppression
alter table if exists public.announcements
  add column if not exists image_public_id text;

