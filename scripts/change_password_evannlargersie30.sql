-- Script pour changer le mot de passe de evannlargersie30@gmail.com
-- Nouveau mot de passe: GoLLoum36012

-- D'abord, vérifier que l'utilisateur existe
SELECT id, email FROM auth.users WHERE email = 'evannlargersie30@gmail.com';

-- Mettre à jour le mot de passe (nécessite l'extension pgcrypto)
-- Le mot de passe sera hashé automatiquement par Supabase Auth
UPDATE auth.users 
SET encrypted_password = crypt('GoLLoum36012', gen_salt('bf'))
WHERE email = 'evannlargersie30@gmail.com';

-- Vérifier la mise à jour
SELECT id, email, encrypted_password IS NOT NULL as password_updated 
FROM auth.users 
WHERE email = 'evannlargersie30@gmail.com';
