-- Ajouter la colonne featured_banner à la table tracks
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne si elle n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tracks' 
        AND column_name = 'featured_banner'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tracks 
        ADD COLUMN featured_banner TEXT;
        
        RAISE NOTICE 'Colonne featured_banner ajoutée à la table tracks';
    ELSE
        RAISE NOTICE 'Colonne featured_banner existe déjà';
    END IF;
END $$;

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tracks' 
AND table_schema = 'public'
AND column_name = 'featured_banner';
