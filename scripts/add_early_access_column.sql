-- Ajouter la colonne early_access à la table profiles
-- Cette colonne détermine si l'utilisateur fait partie des 50 premiers comptes

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS early_access BOOLEAN DEFAULT FALSE;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_profiles_early_access ON public.profiles(early_access);

-- Optionnel: Marquer les premiers utilisateurs existants comme ayant l'accès anticipé
-- (à exécuter manuellement si nécessaire)
-- UPDATE public.profiles SET early_access = TRUE WHERE id IN (
--   SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 50
-- );
