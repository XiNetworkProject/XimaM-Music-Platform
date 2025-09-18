-- Script pour vérifier et corriger la structure de ai_generations
-- Ce script va d'abord vérifier la structure actuelle, puis la corriger si nécessaire

-- 1. Vérifier la structure actuelle
SELECT '=== STRUCTURE ACTUELLE DE ai_generations ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'ai_generations' 
ORDER BY ordinal_position;

-- 2. Vérifier les contraintes
SELECT '=== CONTRAINTES ACTUELLES ===' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'ai_generations'
ORDER BY tc.constraint_type;

-- 3. Supprimer les colonnes problématiques si elles existent
DO $$ 
BEGIN
    -- Supprimer la colonne audio_url si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'audio_url') THEN
        ALTER TABLE ai_generations DROP COLUMN audio_url;
        RAISE NOTICE 'Colonne audio_url supprimée';
    END IF;
    
    -- Supprimer la colonne stream_audio_url si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'stream_audio_url') THEN
        ALTER TABLE ai_generations DROP COLUMN stream_audio_url;
        RAISE NOTICE 'Colonne stream_audio_url supprimée';
    END IF;
    
    -- Supprimer la colonne image_url si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'image_url') THEN
        ALTER TABLE ai_generations DROP COLUMN image_url;
        RAISE NOTICE 'Colonne image_url supprimée';
    END IF;
    
    -- Supprimer la colonne duration si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'duration') THEN
        ALTER TABLE ai_generations DROP COLUMN duration;
        RAISE NOTICE 'Colonne duration supprimée';
    END IF;
END $$;

-- 4. Vérifier la structure après correction
SELECT '=== STRUCTURE APRÈS CORRECTION ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'ai_generations' 
ORDER BY ordinal_position;

-- 5. Afficher un message de confirmation
SELECT 'Structure de ai_generations corrigée avec succès!' as message;
