-- Trigger pour synchroniser automatiquement les utilisateurs
-- entre auth.users et la table users

-- 1. Créer la fonction de synchronisation
CREATE OR REPLACE FUNCTION sync_user_to_table()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est un nouvel utilisateur (INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.users (id, email, subscription_plan, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'free', -- Plan par défaut
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
  END IF;
  
  -- Si c'est une mise à jour (UPDATE)
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.users 
    SET 
      email = NEW.email,
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    
    RETURN NEW;
  END IF;
  
  -- Si c'est une suppression (DELETE)
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.users WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer le trigger sur auth.users
DROP TRIGGER IF EXISTS sync_user_trigger ON auth.users;
CREATE TRIGGER sync_user_trigger
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_table();

-- 3. Synchroniser les utilisateurs existants
INSERT INTO public.users (id, email, subscription_plan, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'free' as subscription_plan,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;

-- 4. Vérifier la synchronisation
SELECT 
  'auth.users' as source,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'public.users' as source,
  COUNT(*) as count
FROM public.users;
