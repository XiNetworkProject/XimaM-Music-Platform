-- Script pour corriger le schéma de la table ai_generations
-- Ajoute les colonnes manquantes title et style

-- Ajouter les colonnes manquantes si elles n'existent pas
DO $$ 
BEGIN
    -- Colonne title
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'title') THEN
        ALTER TABLE ai_generations ADD COLUMN title VARCHAR(255) DEFAULT 'Musique générée';
        RAISE NOTICE 'Colonne title ajoutée à ai_generations';
    END IF;
    
    -- Colonne style
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'style') THEN
        ALTER TABLE ai_generations ADD COLUMN style VARCHAR(255) DEFAULT 'Custom';
        RAISE NOTICE 'Colonne style ajoutée à ai_generations';
    END IF;
    
    -- Colonne completed_at (si elle n'existe pas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'completed_at') THEN
        ALTER TABLE ai_generations ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Colonne completed_at ajoutée à ai_generations';
    END IF;
    
END $$;

-- Vérifier la structure finale
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'ai_generations' 
ORDER BY ordinal_position;
