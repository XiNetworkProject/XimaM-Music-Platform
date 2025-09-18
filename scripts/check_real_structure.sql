-- Script simple pour vérifier la structure réelle de ai_generations

-- Vérifier si la table existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_generations') 
        THEN 'Table ai_generations existe'
        ELSE 'Table ai_generations n''existe pas'
    END as table_status;

-- Si la table existe, afficher sa structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'ai_generations' 
ORDER BY ordinal_position;

-- Vérifier les contraintes
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'ai_generations'
ORDER BY tc.constraint_type;

-- Afficher un exemple de données si la table contient des données
SELECT 'Exemple de données:' as info;
SELECT * FROM ai_generations LIMIT 1;
