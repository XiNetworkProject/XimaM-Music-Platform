-- Table pour les générations IA
CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    model VARCHAR(50) NOT NULL DEFAULT 'audiocraft',
    style VARCHAR(50),
    quality VARCHAR(20) DEFAULT '256kbps',
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_generations_updated_at 
    BEFORE UPDATE ON ai_generations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs ne peuvent voir que leurs propres générations
CREATE POLICY "Users can view own ai generations" ON ai_generations
    FOR SELECT USING (auth.uid() = user_id);

-- Politique : les utilisateurs ne peuvent créer que leurs propres générations
CREATE POLICY "Users can create own ai generations" ON ai_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs ne peuvent modifier que leurs propres générations
CREATE POLICY "Users can update own ai generations" ON ai_generations
    FOR UPDATE USING (auth.uid() = user_id);

-- Politique : les utilisateurs ne peuvent supprimer que leurs propres générations
CREATE POLICY "Users can delete own ai generations" ON ai_generations
    FOR DELETE USING (auth.uid() = user_id);

-- Fonction pour compter les générations du mois en cours
CREATE OR REPLACE FUNCTION get_monthly_generations_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM ai_generations
        WHERE user_id = user_uuid
        AND created_at >= date_trunc('month', NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si un utilisateur a encore des quotas
CREATE OR REPLACE FUNCTION check_user_quota(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_plan VARCHAR(20);
    current_usage INTEGER;
    max_generations INTEGER;
BEGIN
    -- Récupérer le plan de l'utilisateur
    SELECT subscription_plan INTO user_plan
    FROM users
    WHERE id = user_uuid;
    
    -- Compter les générations du mois
    SELECT get_monthly_generations_count(user_uuid) INTO current_usage;
    
    -- Définir les limites selon le plan
    CASE user_plan
        WHEN 'free' THEN max_generations := 10;
        WHEN 'starter' THEN max_generations := 50;
        WHEN 'creator' THEN max_generations := 200;
        WHEN 'pro' THEN max_generations := 1000;
        WHEN 'enterprise' THEN max_generations := 9999;
        ELSE max_generations := 10;
    END CASE;
    
    RETURN current_usage < max_generations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
