-- Ajouter le champ task_id à la table ai_generations
-- Ce champ permettra de suivre les générations Suno via webhook

-- Vérifier si la colonne existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_generations' 
        AND column_name = 'task_id'
    ) THEN
        -- Ajouter la colonne task_id
        ALTER TABLE ai_generations 
        ADD COLUMN task_id VARCHAR(255);
        
        -- Ajouter un index pour optimiser les recherches
        CREATE INDEX idx_ai_generations_task_id ON ai_generations(task_id);
        
        RAISE NOTICE 'Colonne task_id ajoutée à la table ai_generations';
    ELSE
        RAISE NOTICE 'Colonne task_id existe déjà dans la table ai_generations';
    END IF;
END $$;

-- Vérifier la structure mise à jour
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ai_generations' 
ORDER BY ordinal_position;
