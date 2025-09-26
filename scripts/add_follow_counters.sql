-- Ajouter les colonnes de compteurs de followers à la table profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Créer une fonction pour mettre à jour les compteurs de followers
CREATE OR REPLACE FUNCTION update_follow_counts(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Mettre à jour le nombre de followers (combien de personnes suivent cet utilisateur)
  UPDATE profiles 
  SET follower_count = (
    SELECT COUNT(*) 
    FROM user_follows 
    WHERE following_id = user_id
  )
  WHERE id = user_id;
  
  -- Mettre à jour le nombre de following (combien de personnes cet utilisateur suit)
  UPDATE profiles 
  SET following_count = (
    SELECT COUNT(*) 
    FROM user_follows 
    WHERE follower_id = user_id
  )
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour mettre à jour automatiquement les compteurs
CREATE OR REPLACE FUNCTION trigger_update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour les compteurs pour l'utilisateur suivi (follower_count)
  PERFORM update_follow_counts(NEW.following_id);
  
  -- Mettre à jour les compteurs pour l'utilisateur qui suit (following_count)
  PERFORM update_follow_counts(NEW.follower_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour INSERT
DROP TRIGGER IF EXISTS trigger_follow_insert ON user_follows;
CREATE TRIGGER trigger_follow_insert
  AFTER INSERT ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_follow_counts();

-- Créer le trigger pour DELETE
DROP TRIGGER IF EXISTS trigger_follow_delete ON user_follows;
CREATE TRIGGER trigger_follow_delete
  AFTER DELETE ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_follow_counts();

-- Initialiser les compteurs pour tous les utilisateurs existants
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    PERFORM update_follow_counts(user_record.id);
  END LOOP;
END $$;
