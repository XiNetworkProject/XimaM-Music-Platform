-- Table pour les bulletins météo
CREATE TABLE IF NOT EXISTS meteo_bulletins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    content TEXT,
    image_url TEXT NOT NULL,
    image_public_id TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_meteo_bulletins_author_id ON meteo_bulletins(author_id);
CREATE INDEX IF NOT EXISTS idx_meteo_bulletins_is_current ON meteo_bulletins(is_current);
CREATE INDEX IF NOT EXISTS idx_meteo_bulletins_created_at ON meteo_bulletins(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE meteo_bulletins ENABLE ROW LEVEL SECURITY;

-- Politique : seuls les utilisateurs avec email alertempsfrance@gmail.com peuvent voir/créer/modifier
CREATE POLICY "meteo_bulletins_policy" ON meteo_bulletins
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = meteo_bulletins.author_id 
            AND auth.users.email = 'alertempsfrance@gmail.com'
        )
    );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_meteo_bulletins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER meteo_bulletins_updated_at
    BEFORE UPDATE ON meteo_bulletins
    FOR EACH ROW
    EXECUTE FUNCTION update_meteo_bulletins_updated_at();
