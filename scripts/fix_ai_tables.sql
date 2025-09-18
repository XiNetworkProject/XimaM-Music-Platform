-- Script de correction pour les tables IA existantes
-- À exécuter si les tables existent déjà mais sans certaines colonnes

-- Ajouter les colonnes manquantes à ai_generations
ALTER TABLE ai_generations 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Ajouter les colonnes manquantes à ai_tracks
ALTER TABLE ai_tracks 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Ajouter les colonnes manquantes à user_quotas
ALTER TABLE user_quotas 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reset_date DATE DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ajouter les colonnes manquantes à ai_playlists
ALTER TABLE ai_playlists 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ajouter les colonnes manquantes à ai_playlist_tracks
ALTER TABLE ai_playlist_tracks 
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Ajouter les colonnes manquantes à ai_usage_stats
ALTER TABLE ai_usage_stats 
ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- Créer les index manquants
CREATE INDEX IF NOT EXISTS idx_ai_generations_favorite ON ai_generations(is_favorite);
CREATE INDEX IF NOT EXISTS idx_ai_tracks_favorite ON ai_tracks(is_favorite);
CREATE INDEX IF NOT EXISTS idx_user_quotas_reset_date ON user_quotas(reset_date);
CREATE INDEX IF NOT EXISTS idx_ai_playlists_public ON ai_playlists(is_public);

-- Vérifier que toutes les colonnes existent
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('ai_generations', 'ai_tracks', 'user_quotas', 'ai_playlists', 'ai_playlist_tracks', 'ai_usage_stats')
ORDER BY table_name, column_name;
