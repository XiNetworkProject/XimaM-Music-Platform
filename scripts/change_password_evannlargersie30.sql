-- Script pour changer le mot de passe de evannlargersie30@gmail.com
-- Nouveau mot de passe: GoLLoum36012

-- Méthode 1: Utiliser la fonction Supabase Auth pour changer le mot de passe
-- D'abord, vérifier que l'utilisateur existe
SELECT id, email FROM auth.users WHERE email = 'evannlargersie30@gmail.com';

-- Méthode 2: Utiliser la fonction auth.update_user_password (si disponible)
-- Cette méthode est plus sûre car elle utilise le système de hachage de Supabase
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur
    SELECT id INTO user_id FROM auth.users WHERE email = 'evannlargersie30@gmail.com';
    
    IF user_id IS NOT NULL THEN
        -- Mettre à jour le mot de passe avec le bon format Supabase
        UPDATE auth.users 
        SET 
            encrypted_password = crypt('GoLLoum36012', gen_salt('bf')),
            updated_at = now()
        WHERE id = user_id;
        
        RAISE NOTICE 'Mot de passe mis à jour pour l''utilisateur: %', user_id;
    ELSE
        RAISE NOTICE 'Utilisateur non trouvé: evannlargersie30@gmail.com';
    END IF;
END $$;

-- Vérifier la mise à jour
SELECT 
    id, 
    email, 
    encrypted_password IS NOT NULL as password_updated,
    updated_at
FROM auth.users 
WHERE email = 'evannlargersie30@gmail.com';
