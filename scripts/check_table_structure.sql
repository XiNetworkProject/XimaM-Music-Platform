-- Script pour vérifier la structure réelle des tables
-- Vérifier la structure de ai_generations

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'ai_generations' 
ORDER BY ordinal_position;

-- Vérifier la structure de ai_tracks
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'ai_tracks' 
ORDER BY ordinal_position;

-- Vérifier les contraintes
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('ai_generations', 'ai_tracks')
ORDER BY tc.table_name, tc.constraint_type;
