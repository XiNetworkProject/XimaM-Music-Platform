-- Script de correction des politiques RLS pour Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier que RLS est activé sur la table tracks
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- 2. Ajouter la politique manquante pour l'insertion de pistes
DROP POLICY IF EXISTS "Utilisateur peut créer des pistes" ON tracks;
CREATE POLICY "Utilisateur peut créer des pistes" ON tracks 
FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- 3. Vérifier toutes les politiques existantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'tracks'
ORDER BY policyname;

-- 4. Test d'insertion (optionnel - à exécuter après authentification)
-- INSERT INTO tracks (
--   id, title, description, genre, audio_url, cover_url, 
--   duration, creator_id, is_public, plays, likes, is_featured
-- ) VALUES (
--   'test_rls_fix', 'Test RLS Fix', 'Test Description', 
--   ARRAY['Test'], 'https://test.com/test.mp3', null,
--   120, auth.uid(), true, 0, 0, false
-- );
