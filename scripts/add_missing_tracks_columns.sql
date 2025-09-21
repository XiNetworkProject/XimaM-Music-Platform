-- Ajouter toutes les colonnes manquantes à la table tracks
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne is_featured si elle n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tracks' 
        AND column_name = 'is_featured'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tracks 
        ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Colonne is_featured ajoutée à la table tracks';
    ELSE
        RAISE NOTICE 'Colonne is_featured existe déjà';
    END IF;
END $$;

-- Ajouter la colonne featured_banner si elle n'existe pas
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

-- Ajouter la colonne is_public si elle n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tracks' 
        AND column_name = 'is_public'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tracks 
        ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
        
        RAISE NOTICE 'Colonne is_public ajoutée à la table tracks';
    ELSE
        RAISE NOTICE 'Colonne is_public existe déjà';
    END IF;
END $$;

-- Vérifier que toutes les colonnes ont été ajoutées
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tracks' 
AND table_schema = 'public'
AND column_name IN ('is_featured', 'featured_banner', 'is_public')
ORDER BY column_name;
