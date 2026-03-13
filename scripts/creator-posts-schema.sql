-- ============================================================
-- Fil créateurs Synaura — Migration SQL
-- À exécuter dans l'éditeur SQL Supabase
-- ============================================================

-- Posts des créateurs
CREATE TABLE IF NOT EXISTS creator_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text','photo','track_share')),
  content TEXT,
  image_url TEXT,
  track_id TEXT,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Likes sur les posts
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES creator_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Commentaires sur les posts
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES creator_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_creator_posts_creator ON creator_posts(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_posts_public ON creator_posts(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE creator_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Policies creator_posts
CREATE POLICY "creator_posts_select" ON creator_posts FOR SELECT USING (is_public = true);
CREATE POLICY "creator_posts_insert" ON creator_posts FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "creator_posts_update" ON creator_posts FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "creator_posts_delete" ON creator_posts FOR DELETE USING (auth.uid() = creator_id);

-- Policies post_likes
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Policies post_comments
CREATE POLICY "post_comments_select" ON post_comments FOR SELECT USING (true);
CREATE POLICY "post_comments_insert" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_comments_delete" ON post_comments FOR DELETE USING (auth.uid() = user_id);
