-- Script de création des tables Supabase
-- À exécuter dans l'éditeur SQL de Supabase

-- Enable RLS (Row Level Security)
-- Note: app.jwt_secret est géré automatiquement par Supabase

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar TEXT,
  banner TEXT,
  bio TEXT DEFAULT '',
  location TEXT DEFAULT '',
  website TEXT DEFAULT '',
  social_links JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  is_artist BOOLEAN DEFAULT FALSE,
  artist_name TEXT DEFAULT '',
  genre TEXT[] DEFAULT '{}',
  total_plays INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des pistes audio
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  duration INTEGER DEFAULT 0,
  genre TEXT[] DEFAULT '{}',
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  plays INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des playlists
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url TEXT,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de liaison playlists-tracks
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id SERIAL PRIMARY KEY,
  playlist_id TEXT REFERENCES playlists(id) ON DELETE CASCADE,
  track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

-- Table des commentaires
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réactions aux commentaires
CREATE TABLE IF NOT EXISTS comment_reactions (
  id SERIAL PRIMARY KEY,
  comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Table des conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des participants aux conversations
CREATE TABLE IF NOT EXISTS conversation_participants (
  id SERIAL PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des likes de pistes
CREATE TABLE IF NOT EXISTS track_likes (
  id SERIAL PRIMARY KEY,
  track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(track_id, user_id)
);

-- Table des abonnements
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des relations de suivi
CREATE TABLE IF NOT EXISTS user_follows (
  id SERIAL PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Table des demandes de suivi
CREATE TABLE IF NOT EXISTS follow_requests (
  id SERIAL PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, target_id)
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des statistiques de lecture
CREATE TABLE IF NOT EXISTS play_stats (
  id SERIAL PRIMARY KEY,
  track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_played INTEGER DEFAULT 0,
  ip_address INET,
  user_agent TEXT
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tracks_creator ON tracks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks USING GIN(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_popular ON tracks(plays DESC, likes DESC);
CREATE INDEX IF NOT EXISTS idx_comments_track ON comments(track_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_artist ON profiles(is_artist, total_plays DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_follow_requests_updated_at BEFORE UPDATE ON follow_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Politiques de sécurité
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Politiques pour les profils
CREATE POLICY "Profils visibles par tous" ON profiles FOR SELECT USING (true);
CREATE POLICY "Utilisateur peut modifier son profil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Utilisateur peut supprimer son profil" ON profiles FOR DELETE USING (auth.uid() = id);

-- Politiques pour les pistes
CREATE POLICY "Pistes publiques visibles par tous" ON tracks FOR SELECT USING (is_public = true);
CREATE POLICY "Utilisateur peut créer des pistes" ON tracks FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Créateur peut modifier sa piste" ON tracks FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Créateur peut supprimer sa piste" ON tracks FOR DELETE USING (auth.uid() = creator_id);

-- Politiques pour les commentaires
CREATE POLICY "Commentaires visibles par tous" ON comments FOR SELECT USING (true);
CREATE POLICY "Utilisateur peut créer un commentaire" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Utilisateur peut modifier son commentaire" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Utilisateur peut supprimer son commentaire" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour les playlists
CREATE POLICY "Playlists publiques visibles par tous" ON playlists FOR SELECT USING (is_public = true);
CREATE POLICY "Créateur peut modifier sa playlist" ON playlists FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Créateur peut supprimer sa playlist" ON playlists FOR DELETE USING (auth.uid() = creator_id);

-- Politiques pour les messages
CREATE POLICY "Utilisateur peut voir les messages de ses conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp 
    WHERE cp.conversation_id = messages.conversation_id 
    AND cp.user_id = auth.uid()
  )
);
CREATE POLICY "Utilisateur peut envoyer des messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Politiques pour les abonnements
CREATE POLICY "Utilisateur peut voir son abonnement" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Utilisateur peut modifier son abonnement" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Fonction pour obtenir les statistiques d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE(
  total_tracks BIGINT,
  total_playlists BIGINT,
  total_followers BIGINT,
  total_following BIGINT,
  total_likes BIGINT,
  total_plays BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM tracks WHERE creator_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM playlists WHERE creator_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM user_follows WHERE following_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM user_follows WHERE follower_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM track_likes WHERE user_id = user_uuid)::BIGINT,
    (SELECT COALESCE(SUM(plays), 0) FROM tracks WHERE creator_id = user_uuid)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour rechercher des pistes
CREATE OR REPLACE FUNCTION search_tracks(search_query TEXT)
RETURNS TABLE(
  id TEXT,
  title TEXT,
  description TEXT,
  audio_url TEXT,
  cover_url TEXT,
  duration INTEGER,
  genre TEXT[],
  creator_id UUID,
  plays INTEGER,
  likes INTEGER,
  creator_name TEXT,
  creator_username TEXT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.audio_url,
    t.cover_url,
    t.duration,
    t.genre,
    t.creator_id,
    t.plays,
    t.likes,
    p.name as creator_name,
    p.username as creator_username,
    GREATEST(
      similarity(t.title, search_query),
      similarity(t.description, search_query),
      similarity(p.name, search_query),
      similarity(p.username, search_query)
    ) as similarity
  FROM tracks t
  LEFT JOIN profiles p ON t.creator_id = p.id
  WHERE 
    t.is_public = true AND (
      t.title ILIKE '%' || search_query || '%' OR
      t.description ILIKE '%' || search_query || '%' OR
      p.name ILIKE '%' || search_query || '%' OR
      p.username ILIKE '%' || search_query || '%' OR
      search_query = ANY(t.genre)
    )
  ORDER BY similarity DESC, t.plays DESC, t.likes DESC;
END;
$$ LANGUAGE plpgsql;

-- Extension pour la recherche de similarité
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Vues utiles
CREATE OR REPLACE VIEW trending_tracks AS
SELECT 
  t.*,
  p.name as creator_name,
  p.username as creator_username,
  p.avatar as creator_avatar,
  (t.plays * 0.7 + t.likes * 0.3) as trending_score
FROM tracks t
LEFT JOIN profiles p ON t.creator_id = p.id
WHERE t.is_public = true
ORDER BY trending_score DESC, t.created_at DESC;

CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  'track' as type,
  t.id,
  t.title as name,
  t.cover_url as image,
  t.created_at,
  p.name as creator_name,
  p.username as creator_username
FROM tracks t
LEFT JOIN profiles p ON t.creator_id = p.id
WHERE t.is_public = true
UNION ALL
SELECT 
  'comment' as type,
  c.id,
  c.content as name,
  t.cover_url as image,
  c.created_at,
  p.name as creator_name,
  p.username as creator_username
FROM comments c
LEFT JOIN tracks t ON c.track_id = t.id
LEFT JOIN profiles p ON c.user_id = p.id
ORDER BY created_at DESC;

-- Insertion des données de test (optionnel)
-- Note: L'utilisateur admin doit être créé via Supabase Auth avant d'être inséré ici
-- INSERT INTO profiles (id, name, email, username) VALUES 
--   ('00000000-0000-0000-0000-000000000001', 'Admin', 'admin@ximam.com', 'admin')
-- ON CONFLICT (id) DO NOTHING;

COMMIT;
