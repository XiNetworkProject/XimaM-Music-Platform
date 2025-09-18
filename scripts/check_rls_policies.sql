-- Script pour vérifier et corriger les politiques RLS
-- Vérifier les politiques existantes

-- 1. Vérifier les politiques sur ai_generations
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ai_generations';

-- 2. Vérifier les politiques sur ai_tracks
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ai_tracks';

-- 3. Vérifier si RLS est activé
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('ai_generations', 'ai_tracks');

-- 4. Créer des politiques si elles n'existent pas
DO $$ 
BEGIN
    -- Politique pour ai_generations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_generations' 
        AND policyname = 'ai_generations_user_policy'
    ) THEN
        CREATE POLICY ai_generations_user_policy ON ai_generations
        FOR ALL USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Politique ai_generations_user_policy créée';
    END IF;
    
    -- Politique pour ai_tracks
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_tracks' 
        AND policyname = 'ai_tracks_user_policy'
    ) THEN
        CREATE POLICY ai_tracks_user_policy ON ai_tracks
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM ai_generations 
                WHERE ai_generations.id = ai_tracks.generation_id 
                AND ai_generations.user_id = auth.uid()
            )
        );
        
        RAISE NOTICE 'Politique ai_tracks_user_policy créée';
    END IF;
END $$;
