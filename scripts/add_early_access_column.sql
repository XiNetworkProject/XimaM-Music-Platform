-- Ajouter la colonne early_access à la table profiles
-- Cette colonne contrôle l'accès anticipé à l'application

-- Ajouter la colonne si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'early_access'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN early_access BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_profiles_early_access ON public.profiles(early_access);

-- Ajouter une contrainte pour limiter à 50 utilisateurs early access
-- (Cette contrainte sera vérifiée au niveau application)
COMMENT ON COLUMN public.profiles.early_access IS 'Contrôle l''accès anticipé à l''application (limite: 50 utilisateurs)';
