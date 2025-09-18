-- Script de création des tables pour le système de génération IA complet
-- Inclut : générations, quotas, favoris, playlists, statistiques

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

-- RLS (Row Level Security) Policies
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_track_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_stats ENABLE ROW LEVEL SECURITY;

-- Policies pour ai_generations
CREATE POLICY "Users can view their own generations" ON ai_generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations" ON ai_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations" ON ai_generations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations" ON ai_generations
    FOR DELETE USING (auth.uid() = user_id);

-- Policies pour ai_tracks
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

-- Policies pour user_quotas
CREATE POLICY "Users can view their own quota" ON user_quotas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own quota" ON user_quotas
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies pour ai_playlists
CREATE POLICY "Users can view their own playlists" ON ai_playlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists" ON ai_playlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" ON ai_playlists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" ON ai_playlists
    FOR DELETE USING (auth.uid() = user_id);

-- Fonctions utilitaires
CREATE OR REPLACE FUNCTION get_user_quota_remaining(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    quota_record RECORD;
BEGIN
    SELECT * INTO quota_record FROM user_quotas WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        -- Créer un quota par défaut
        INSERT INTO user_quotas (user_id, plan_type, monthly_limit)
        VALUES (user_uuid, 'free', 5);
        RETURN 5;
    END IF;
    
    -- Vérifier si on doit reset le quota
    IF quota_record.reset_date < CURRENT_DATE THEN
        UPDATE user_quotas 
        SET used_this_month = 0, 
            reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'
        WHERE user_id = user_uuid;
        RETURN quota_record.monthly_limit;
    END IF;
    
    RETURN GREATEST(0, quota_record.monthly_limit - quota_record.used_this_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour incrémenter l'utilisation
CREATE OR REPLACE FUNCTION increment_ai_usage(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    quota_record RECORD;
BEGIN
    SELECT * INTO quota_record FROM user_quotas WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        -- Créer un quota par défaut
        INSERT INTO user_quotas (user_id, plan_type, monthly_limit, used_this_month)
        VALUES (user_uuid, 'free', 5, 1);
        RETURN TRUE;
    END IF;
    
    -- Vérifier si on a encore du quota
    IF get_user_quota_remaining(user_uuid) <= 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Incrémenter l'utilisation
    UPDATE user_quotas 
    SET used_this_month = used_this_month + 1,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_ai_stats(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_generations', COUNT(*),
        'total_tracks', (
            SELECT COUNT(*) FROM ai_tracks at
            JOIN ai_generations ag ON at.generation_id = ag.id
            WHERE ag.user_id = user_uuid
        ),
        'total_duration', COALESCE(SUM(total_duration), 0),
        'favorite_count', (
            SELECT COUNT(*) FROM ai_generations 
            WHERE user_id = user_uuid AND is_favorite = TRUE
        ),
        'recent_activity', (
            SELECT json_agg(
                json_build_object(
                    'date', date,
                    'generations', generations_count,
                    'duration', total_duration
                )
            ) FROM ai_usage_stats 
            WHERE user_id = user_uuid 
            AND date >= CURRENT_DATE - days_back
            ORDER BY date DESC
        )
    ) INTO result
    FROM ai_usage_stats
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour les statistiques
CREATE OR REPLACE FUNCTION update_ai_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ai_usage_stats (user_id, date, generations_count, total_duration)
    VALUES (
        NEW.user_id, 
        CURRENT_DATE, 
        1, 
        COALESCE(NEW.metadata->>'total_duration', '0')::INTEGER
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET 
        generations_count = ai_usage_stats.generations_count + 1,
        total_duration = ai_usage_stats.total_duration + COALESCE(NEW.metadata->>'total_duration', '0')::INTEGER;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_usage_stats
    AFTER INSERT ON ai_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_usage_stats();

-- Vues utiles
CREATE OR REPLACE VIEW user_ai_library AS
SELECT 
    ag.id as generation_id,
    ag.prompt,
    ag.model,
    ag.status,
    ag.created_at,
    ag.is_favorite,
    ag.play_count,
    ag.like_count,
    ag.share_count,
    json_agg(
        json_build_object(
            'id', at.id,
            'title', at.title,
            'audio_url', at.audio_url,
            'stream_audio_url', at.stream_audio_url,
            'image_url', at.image_url,
            'duration', at.duration,
            'is_favorite', at.is_favorite,
            'play_count', at.play_count,
            'like_count', at.like_count
        )
    ) as tracks
FROM ai_generations ag
LEFT JOIN ai_tracks at ON ag.id = at.generation_id
WHERE ag.user_id = auth.uid()
GROUP BY ag.id, ag.prompt, ag.model, ag.status, ag.created_at, ag.is_favorite, ag.play_count, ag.like_count, ag.share_count
ORDER BY ag.created_at DESC;

-- Permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMENT ON TABLE ai_generations IS 'Générations IA des utilisateurs';
COMMENT ON TABLE ai_tracks IS 'Tracks individuelles générées par IA';
COMMENT ON TABLE user_quotas IS 'Quotas mensuels des utilisateurs';
COMMENT ON TABLE ai_playlists IS 'Playlists de musiques IA';
COMMENT ON TABLE ai_usage_stats IS 'Statistiques d''utilisation IA';
