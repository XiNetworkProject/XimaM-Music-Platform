-- Ajouter la colonne lyrics à la table tracks
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne lyrics si elle n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tracks' 
        AND column_name = 'lyrics'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tracks 
        ADD COLUMN lyrics TEXT;
        
        RAISE NOTICE 'Colonne lyrics ajoutée à la table tracks';
    ELSE
        RAISE NOTICE 'Colonne lyrics existe déjà';
    END IF;
END $$;

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tracks' 
AND table_schema = 'public'
AND column_name = 'lyrics';
