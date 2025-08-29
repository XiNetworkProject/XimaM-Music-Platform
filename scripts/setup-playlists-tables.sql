-- Script de création des tables pour le système de playlists
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Créer la table playlists
CREATE TABLE IF NOT EXISTS playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  likes TEXT[] DEFAULT '{}',
  followers TEXT[] DEFAULT '{}'
);

-- 2. Créer la table playlist_tracks (relation many-to-many)
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

-- 3. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_playlists_created_by ON playlists(created_by);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);

-- 4. Activer RLS (Row Level Security) si nécessaire
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- 5. Créer des politiques RLS basiques (à adapter selon vos besoins)
-- Politique pour les playlists publiques
CREATE POLICY "Playlists publiques visibles par tous" ON playlists
  FOR SELECT USING (is_public = true);

-- Politique pour les playlists privées (seulement le créateur)
CREATE POLICY "Playlists privées visibles par le créateur" ON playlists
  FOR SELECT USING (created_by = auth.uid() OR is_public = true);

-- Politique pour créer des playlists
CREATE POLICY "Créer des playlists" ON playlists
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Politique pour modifier ses propres playlists
CREATE POLICY "Modifier ses propres playlists" ON playlists
  FOR UPDATE USING (created_by = auth.uid());

-- Politique pour supprimer ses propres playlists
CREATE POLICY "Supprimer ses propres playlists" ON playlists
  FOR DELETE USING (created_by = auth.uid());

-- Politiques pour playlist_tracks
CREATE POLICY "Voir les tracks des playlists publiques" ON playlist_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND (playlists.is_public = true OR playlists.created_by = auth.uid())
    )
  );

CREATE POLICY "Ajouter des tracks aux playlists" ON playlist_tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.created_by = auth.uid()
    )
  );

CREATE POLICY "Supprimer des tracks des playlists" ON playlist_tracks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_tracks.playlist_id 
      AND playlists.created_by = auth.uid()
    )
  );

-- 6. Créer une fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_playlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Créer le trigger pour updated_at
CREATE TRIGGER update_playlist_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_updated_at();

-- 8. Insérer quelques playlists de test (optionnel)
-- INSERT INTO playlists (name, description, created_by) VALUES 
--   ('Ma première playlist', 'Une playlist de test', 'default-user-id'),
--   ('Favoris', 'Mes morceaux préférés', 'default-user-id');
