-- Script sécurisé pour créer la table ai_generations
-- Ce script peut être exécuté plusieurs fois sans erreur

-- Créer la table ai_generations si elle n'existe pas
CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL UNIQUE,
    prompt TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'V4_5',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Créer la table ai_tracks si elle n'existe pas
CREATE TABLE IF NOT EXISTS ai_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    generation_id UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
    suno_id TEXT,
    title TEXT NOT NULL DEFAULT 'Musique générée',
    audio_url TEXT NOT NULL,
    stream_audio_url TEXT,
    image_url TEXT,
    duration INTEGER DEFAULT 120,
    prompt TEXT,
    model_name TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_favorite BOOLEAN DEFAULT FALSE,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0
);

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_task_id ON ai_generations(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_tracks_generation_id ON ai_tracks(generation_id);
CREATE INDEX IF NOT EXISTS idx_ai_tracks_suno_id ON ai_tracks(suno_id);

-- Activer RLS (Row Level Security)
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tracks ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour ai_generations
DROP POLICY IF EXISTS "Users can view their own generations" ON ai_generations;
CREATE POLICY "Users can view their own generations" ON ai_generations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own generations" ON ai_generations;
CREATE POLICY "Users can insert their own generations" ON ai_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own generations" ON ai_generations;
CREATE POLICY "Users can update their own generations" ON ai_generations
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own generations" ON ai_generations;
CREATE POLICY "Users can delete their own generations" ON ai_generations
    FOR DELETE USING (auth.uid() = user_id);

-- Créer les politiques RLS pour ai_tracks
DROP POLICY IF EXISTS "Users can view tracks from their generations" ON ai_tracks;
CREATE POLICY "Users can view tracks from their generations" ON ai_tracks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ai_generations 
            WHERE ai_generations.id = ai_tracks.generation_id 
            AND ai_generations.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert tracks to their generations" ON ai_tracks;
CREATE POLICY "Users can insert tracks to their generations" ON ai_tracks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_generations 
            WHERE ai_generations.id = ai_tracks.generation_id 
            AND ai_generations.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update tracks from their generations" ON ai_tracks;
CREATE POLICY "Users can update tracks from their generations" ON ai_tracks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM ai_generations 
            WHERE ai_generations.id = ai_tracks.generation_id 
            AND ai_generations.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete tracks from their generations" ON ai_tracks;
CREATE POLICY "Users can delete tracks from their generations" ON ai_tracks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM ai_generations 
            WHERE ai_generations.id = ai_tracks.generation_id 
            AND ai_generations.user_id = auth.uid()
        )
    );

-- Créer les fonctions pour les quotas (si elles n'existent pas)
CREATE OR REPLACE FUNCTION get_user_quota_remaining(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_quota RECORD;
    used_count INTEGER;
BEGIN
    -- Récupérer le quota de l'utilisateur
    SELECT * INTO user_quota FROM user_quotas WHERE user_id = user_uuid;
    
    IF user_quota IS NULL THEN
        -- Créer un quota par défaut si l'utilisateur n'en a pas
        INSERT INTO user_quotas (user_id, plan_type, monthly_limit, used_this_month, reset_date)
        VALUES (user_uuid, 'free', 5, 0, NOW() + INTERVAL '1 month')
        ON CONFLICT (user_id) DO NOTHING;
        
        SELECT * INTO user_quota FROM user_quotas WHERE user_id = user_uuid;
    END IF;
    
    -- Vérifier si le mois a changé
    IF user_quota.reset_date < NOW() THEN
        -- Réinitialiser le compteur
        UPDATE user_quotas 
        SET used_this_month = 0, reset_date = NOW() + INTERVAL '1 month'
        WHERE user_id = user_uuid;
        user_quota.used_this_month := 0;
    END IF;
    
    -- Retourner le nombre restant
    RETURN GREATEST(0, user_quota.monthly_limit - user_quota.used_this_month);
END;
$$;

CREATE OR REPLACE FUNCTION increment_ai_usage(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_quota INTEGER;
BEGIN
    -- Vérifier le quota restant
    current_quota := get_user_quota_remaining(user_uuid);
    
    IF current_quota <= 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Incrémenter l'utilisation
    UPDATE user_quotas 
    SET used_this_month = used_this_month + 1
    WHERE user_id = user_uuid;
    
    RETURN TRUE;
END;
$$;

-- Créer la table user_quotas si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_quotas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')),
    monthly_limit INTEGER NOT NULL DEFAULT 5,
    used_this_month INTEGER NOT NULL DEFAULT 0,
    reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS pour user_quotas
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_quotas
DROP POLICY IF EXISTS "Users can view their own quota" ON user_quotas;
CREATE POLICY "Users can view their own quota" ON user_quotas
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quota" ON user_quotas;
CREATE POLICY "Users can update their own quota" ON user_quotas
    FOR UPDATE USING (auth.uid() = user_id);

-- Index pour user_quotas
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_quotas(user_id);

-- Afficher un message de confirmation
SELECT 'Tables ai_generations, ai_tracks et user_quotas créées avec succès!' as message;
