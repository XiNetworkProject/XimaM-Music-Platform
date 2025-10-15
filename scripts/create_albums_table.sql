-- Table pour les albums
CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Informations de base
  title text NOT NULL,
  artist text NOT NULL,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Métadonnées
  release_date date,
  genre text[] DEFAULT '{}',
  description text,
  
  -- Médias
  cover_url text,
  cover_public_id text, -- Pour Cloudinary
  
  -- Paramètres
  is_explicit boolean DEFAULT false,
  is_public boolean DEFAULT true,
  
  -- Copyright
  copyright_owner text,
  copyright_year integer,
  copyright_rights text DEFAULT 'Tous droits réservés',
  
  -- Statistiques
  total_plays bigint DEFAULT 0,
  total_likes bigint DEFAULT 0,
  
  -- Index et contraintes
  CONSTRAINT albums_title_check CHECK (char_length(title) >= 1 AND char_length(title) <= 200)
);

-- Modifier la table tracks pour ajouter une référence optionnelle à l'album
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS track_number integer;

-- Modifier la table ai_tracks pour ajouter une référence optionnelle à l'album
ALTER TABLE public.ai_tracks 
ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS track_number integer;

-- Index pour les albums
CREATE INDEX IF NOT EXISTS idx_albums_creator ON public.albums(creator_id);
CREATE INDEX IF NOT EXISTS idx_albums_created ON public.albums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_public ON public.albums(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_albums_release ON public.albums(release_date DESC) WHERE release_date IS NOT NULL;

-- Index pour les tracks liées aux albums
CREATE INDEX IF NOT EXISTS idx_tracks_album ON public.tracks(album_id) WHERE album_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_tracks_album ON public.ai_tracks(album_id) WHERE album_id IS NOT NULL;

-- RLS (Row Level Security) pour les albums
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- Politique : tout le monde peut lire les albums publics
CREATE POLICY "Albums publics visibles par tous"
  ON public.albums
  FOR SELECT
  USING (is_public = true);

-- Politique : les créateurs peuvent lire tous leurs albums
CREATE POLICY "Créateurs peuvent voir leurs albums"
  ON public.albums
  FOR SELECT
  USING (auth.uid() = creator_id);

-- Politique : les créateurs peuvent créer des albums
CREATE POLICY "Créateurs peuvent créer des albums"
  ON public.albums
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Politique : les créateurs peuvent modifier leurs albums
CREATE POLICY "Créateurs peuvent modifier leurs albums"
  ON public.albums
  FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Politique : les créateurs peuvent supprimer leurs albums
CREATE POLICY "Créateurs peuvent supprimer leurs albums"
  ON public.albums
  FOR DELETE
  USING (auth.uid() = creator_id);

-- Fonction trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON public.albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vue pour récupérer les albums avec leurs pistes
CREATE OR REPLACE VIEW public.albums_with_tracks AS
SELECT 
  a.id,
  a.created_at,
  a.updated_at,
  a.title,
  a.artist,
  a.creator_id,
  a.release_date,
  a.genre,
  a.description,
  a.cover_url,
  a.cover_public_id,
  a.is_explicit,
  a.is_public,
  a.copyright_owner,
  a.copyright_year,
  a.copyright_rights,
  a.total_plays,
  a.total_likes,
  (
    SELECT COUNT(*)
    FROM public.tracks t
    WHERE t.album_id = a.id
  ) as tracks_count,
  (
    SELECT json_agg(
      json_build_object(
        'id', t.id,
        'title', t.title,
        'track_number', t.track_number,
        'duration', t.duration,
        'audio_url', t.audio_url,
        'plays', t.plays
      ) ORDER BY t.track_number
    )
    FROM public.tracks t
    WHERE t.album_id = a.id
  ) as tracks
FROM public.albums a;

COMMENT ON TABLE public.albums IS 'Table pour stocker les albums musicaux';
COMMENT ON COLUMN public.albums.creator_id IS 'Référence vers l''utilisateur qui a créé l''album';
COMMENT ON COLUMN public.albums.cover_public_id IS 'ID public Cloudinary pour suppression';
COMMENT ON VIEW public.albums_with_tracks IS 'Vue pour récupérer les albums avec leurs pistes';
