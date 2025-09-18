-- Script de création des tables pour le système de génération IA complet
-- À exécuter directement dans l'interface SQL Supabase

-- 1. Table principale des générations IA
CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    model VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Table des tracks générées (2 par génération)
CREATE TABLE IF NOT EXISTS ai_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    generation_id UUID REFERENCES ai_generations(id) ON DELETE CASCADE,
    suno_id VARCHAR(255),
    title VARCHAR(255),
    audio_url TEXT,
    stream_audio_url TEXT,
    image_url TEXT,
    duration INTEGER,
    prompt TEXT,
    model_name VARCHAR(50),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_favorite BOOLEAN DEFAULT FALSE,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0
);

-- 3. Table des quotas utilisateurs
CREATE TABLE IF NOT EXISTS user_quotas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    plan_type VARCHAR(50) DEFAULT 'free',
    monthly_limit INTEGER DEFAULT 5,
    used_this_month INTEGER DEFAULT 0,
    reset_date DATE DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table des playlists IA
CREATE TABLE IF NOT EXISTS ai_playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table de liaison playlists-tracks
CREATE TABLE IF NOT EXISTS ai_playlist_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES ai_playlists(id) ON DELETE CASCADE,
    track_id UUID REFERENCES ai_tracks(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    position INTEGER DEFAULT 0,
    UNIQUE(playlist_id, track_id)
);

-- 6. Table des likes sur les tracks IA
CREATE TABLE IF NOT EXISTS ai_track_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id UUID REFERENCES ai_tracks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(track_id, user_id)
);

-- 7. Table des statistiques d'utilisation
CREATE TABLE IF NOT EXISTS ai_usage_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    generations_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_task_id ON ai_generations(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_generations_favorite ON ai_generations(is_favorite);
CREATE INDEX IF NOT EXISTS idx_ai_tracks_generation_id ON ai_tracks(generation_id);
CREATE INDEX IF NOT EXISTS idx_ai_tracks_suno_id ON ai_tracks(suno_id);
CREATE INDEX IF NOT EXISTS idx_ai_tracks_favorite ON ai_tracks(is_favorite);
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_reset_date ON user_quotas(reset_date);
CREATE INDEX IF NOT EXISTS idx_ai_playlists_user_id ON ai_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_playlists_public ON ai_playlists(is_public);
CREATE INDEX IF NOT EXISTS idx_ai_track_likes_track_id ON ai_track_likes(track_id);
CREATE INDEX IF NOT EXISTS idx_ai_track_likes_user_id ON ai_track_likes(user_id);

-- Activer RLS sur toutes les tables
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_track_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_stats ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour ai_generations
CREATE POLICY "Users can view their own generations" ON ai_generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations" ON ai_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations" ON ai_generations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations" ON ai_generations
    FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour ai_tracks
CREATE POLICY "Users can view tracks from their generations" ON ai_tracks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ai_generations 
            WHERE ai_generations.id = ai_tracks.generation_id 
            AND ai_generations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert tracks for their generations" ON ai_tracks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_generations 
            WHERE ai_generations.id = ai_tracks.generation_id 
            AND ai_generations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own tracks" ON ai_tracks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM ai_generations 
            WHERE ai_generations.id = ai_tracks.generation_id 
            AND ai_generations.user_id = auth.uid()
        )
    );

-- Politiques RLS pour user_quotas
CREATE POLICY "Users can view their own quota" ON user_quotas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quota" ON user_quotas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quota" ON user_quotas
    FOR UPDATE USING (auth.uid() = user_id);

-- Politiques RLS pour ai_playlists
CREATE POLICY "Users can view their own playlists" ON ai_playlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists" ON ai_playlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" ON ai_playlists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" ON ai_playlists
    FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour ai_playlist_tracks
CREATE POLICY "Users can view tracks in their playlists" ON ai_playlist_tracks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ai_playlists 
            WHERE ai_playlists.id = ai_playlist_tracks.playlist_id 
            AND ai_playlists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert tracks in their playlists" ON ai_playlist_tracks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_playlists 
            WHERE ai_playlists.id = ai_playlist_tracks.playlist_id 
            AND ai_playlists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete tracks from their playlists" ON ai_playlist_tracks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM ai_playlists 
            WHERE ai_playlists.id = ai_playlist_tracks.playlist_id 
            AND ai_playlists.user_id = auth.uid()
        )
    );

-- Politiques RLS pour ai_track_likes
CREATE POLICY "Users can view all likes" ON ai_track_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON ai_track_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON ai_track_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour ai_usage_stats
CREATE POLICY "Users can view their own stats" ON ai_usage_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON ai_usage_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON ai_usage_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Fonction pour obtenir le quota restant d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_quota_remaining(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    quota_record user_quotas%ROWTYPE;
BEGIN
    SELECT * INTO quota_record FROM user_quotas WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        -- Créer un quota par défaut
        INSERT INTO user_quotas (user_id, plan_type, monthly_limit, used_this_month, reset_date)
        VALUES (user_uuid, 'free', 5, 0, DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day');
        RETURN 5;
    END IF;
    
    -- Vérifier si le mois a changé
    IF quota_record.reset_date < CURRENT_DATE THEN
        -- Réinitialiser le compteur
        UPDATE user_quotas 
        SET used_this_month = 0, 
            reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'
        WHERE user_id = user_uuid;
        RETURN quota_record.monthly_limit;
    END IF;
    
    RETURN GREATEST(0, quota_record.monthly_limit - quota_record.used_this_month);
END;
$$;

-- Fonction pour incrémenter l'utilisation du quota
CREATE OR REPLACE FUNCTION increment_ai_usage(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    quota_record user_quotas%ROWTYPE;
BEGIN
    SELECT * INTO quota_record FROM user_quotas WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        -- Créer un quota par défaut
        INSERT INTO user_quotas (user_id, plan_type, monthly_limit, used_this_month, reset_date)
        VALUES (user_uuid, 'free', 5, 1, DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day');
        RETURN TRUE;
    END IF;
    
    -- Vérifier si le mois a changé
    IF quota_record.reset_date < CURRENT_DATE THEN
        UPDATE user_quotas 
        SET used_this_month = 1, 
            reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'
        WHERE user_id = user_uuid;
        RETURN TRUE;
    END IF;
    
    -- Vérifier si l'utilisateur a encore du quota
    IF quota_record.used_this_month >= quota_record.monthly_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Incrémenter l'utilisation
    UPDATE user_quotas 
    SET used_this_month = used_this_month + 1
    WHERE user_id = user_uuid;
    
    RETURN TRUE;
END;
$$;

-- Fonction pour obtenir les statistiques d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_ai_stats(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_generations', COUNT(*),
        'total_tracks', (
            SELECT COUNT(*) FROM ai_tracks 
            WHERE generation_id IN (
                SELECT id FROM ai_generations WHERE user_id = user_uuid
            )
        ),
        'total_favorites', (
            SELECT COUNT(*) FROM ai_generations 
            WHERE user_id = user_uuid AND is_favorite = true
        ),
        'total_plays', (
            SELECT COALESCE(SUM(play_count), 0) FROM ai_generations 
            WHERE user_id = user_uuid
        ),
        'total_likes', (
            SELECT COALESCE(SUM(like_count), 0) FROM ai_generations 
            WHERE user_id = user_uuid
        )
    ) INTO result
    FROM ai_generations 
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Trigger pour mettre à jour les statistiques
CREATE OR REPLACE FUNCTION update_ai_usage_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO ai_usage_stats (user_id, generations_count)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
        generations_count = ai_usage_stats.generations_count + 1;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_ai_usage_stats
    AFTER INSERT ON ai_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_usage_stats();

-- Permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Commentaires
COMMENT ON TABLE ai_generations IS 'Générations IA des utilisateurs';
COMMENT ON TABLE ai_tracks IS 'Tracks individuelles générées par IA';
COMMENT ON TABLE user_quotas IS 'Quotas mensuels des utilisateurs';
COMMENT ON TABLE ai_playlists IS 'Playlists de musiques IA';
COMMENT ON TABLE ai_usage_stats IS 'Statistiques d''utilisation IA';
