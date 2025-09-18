-- Création de la table ai_generations pour Synaura
-- Cette table stocke les générations IA des utilisateurs

-- 1. Créer la table ai_generations
CREATE TABLE IF NOT EXISTS public.ai_generations (
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

-- 2. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);

-- 3. Créer le trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_ai_generations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_generations_updated_at
    BEFORE UPDATE ON ai_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_generations_updated_at();

-- 4. Activer RLS (Row Level Security)
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS
CREATE POLICY "Users can view own ai generations" ON ai_generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ai generations" ON ai_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai generations" ON ai_generations
    FOR UPDATE USING (auth.uid() = user_id);

-- 6. Créer les fonctions SQL pour les quotas
CREATE OR REPLACE FUNCTION get_monthly_generations_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO count_result
    FROM ai_generations
    WHERE user_id = user_uuid
    AND created_at >= date_trunc('month', CURRENT_DATE);
    
    RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_user_quota(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    user_plan VARCHAR(20);
    monthly_limit INTEGER;
    current_usage INTEGER;
    result JSON;
BEGIN
    -- Récupérer le plan de l'utilisateur
    SELECT subscription_plan INTO user_plan
    FROM users
    WHERE id = user_uuid;
    
    -- Définir les limites selon le plan
    CASE user_plan
        WHEN 'free' THEN monthly_limit := 10;
        WHEN 'starter' THEN monthly_limit := 50;
        WHEN 'creator' THEN monthly_limit := 200;
        WHEN 'pro' THEN monthly_limit := 1000;
        WHEN 'enterprise' THEN monthly_limit := 9999;
        ELSE monthly_limit := 10;
    END CASE;
    
    -- Récupérer l'usage actuel
    current_usage := get_monthly_generations_count(user_uuid);
    
    -- Construire le résultat
    result := json_build_object(
        'plan', user_plan,
        'limit', monthly_limit,
        'used', current_usage,
        'remaining', GREATEST(0, monthly_limit - current_usage),
        'has_quota', current_usage < monthly_limit
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Vérifier la création
SELECT 
    'Table ai_generations créée avec succès' as status,
    COUNT(*) as generation_count
FROM ai_generations;
