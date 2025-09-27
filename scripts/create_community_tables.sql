-- Tables pour le système de communauté Synaura

-- Table des posts du forum
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('question', 'suggestion', 'bug', 'general')),
  tags TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réponses aux posts
CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  is_solution BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des likes sur les posts
CREATE TABLE IF NOT EXISTS forum_post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Table des likes sur les réponses
CREATE TABLE IF NOT EXISTS forum_reply_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id UUID NOT NULL REFERENCES forum_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);

-- Table des FAQ
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('general', 'player', 'upload', 'abonnement', 'ia', 'technique')),
  tags TEXT[] DEFAULT '{}',
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des votes sur les FAQ
CREATE TABLE IF NOT EXISTS faq_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  faq_id UUID NOT NULL REFERENCES faq_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(faq_id, user_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at ON forum_replies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category);
CREATE INDEX IF NOT EXISTS idx_faq_items_published ON faq_items(is_published);

-- Fonction pour mettre à jour le compteur de likes des posts
CREATE OR REPLACE FUNCTION update_forum_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le compteur de réponses des posts
CREATE OR REPLACE FUNCTION update_forum_post_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts SET replies_count = replies_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts SET replies_count = replies_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le compteur de likes des réponses
CREATE OR REPLACE FUNCTION update_forum_reply_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_replies SET likes_count = likes_count + 1 WHERE id = NEW.reply_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_replies SET likes_count = likes_count - 1 WHERE id = OLD.reply_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour les compteurs automatiques
CREATE TRIGGER trigger_update_post_likes_count
  AFTER INSERT OR DELETE ON forum_post_likes
  FOR EACH ROW EXECUTE FUNCTION update_forum_post_likes_count();

CREATE TRIGGER trigger_update_post_replies_count
  AFTER INSERT OR DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_forum_post_replies_count();

CREATE TRIGGER trigger_update_reply_likes_count
  AFTER INSERT OR DELETE ON forum_reply_likes
  FOR EACH ROW EXECUTE FUNCTION update_forum_reply_likes_count();

-- RLS (Row Level Security)
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reply_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_votes ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour forum_posts
CREATE POLICY "Forum posts are viewable by everyone" ON forum_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create forum posts" ON forum_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forum posts" ON forum_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forum posts" ON forum_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour forum_replies
CREATE POLICY "Forum replies are viewable by everyone" ON forum_replies
  FOR SELECT USING (true);

CREATE POLICY "Users can create forum replies" ON forum_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forum replies" ON forum_replies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forum replies" ON forum_replies
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques RLS pour forum_post_likes
CREATE POLICY "Forum post likes are viewable by everyone" ON forum_post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own post likes" ON forum_post_likes
  FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour forum_reply_likes
CREATE POLICY "Forum reply likes are viewable by everyone" ON forum_reply_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own reply likes" ON forum_reply_likes
  FOR ALL USING (auth.uid() = user_id);

-- Politiques RLS pour faq_items
CREATE POLICY "FAQ items are viewable by everyone" ON faq_items
  FOR SELECT USING (is_published = true);

CREATE POLICY "FAQ items are manageable by admins" ON faq_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Politiques RLS pour faq_votes
CREATE POLICY "FAQ votes are viewable by everyone" ON faq_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own FAQ votes" ON faq_votes
  FOR ALL USING (auth.uid() = user_id);

-- Insérer des données de démonstration pour les FAQ
INSERT INTO faq_items (question, answer, category, tags, order_index) VALUES
('Comment télécharger mes musiques ?', 'Le téléchargement est disponible pour les abonnements Pro et Enterprise. Dans le player, cliquez sur les trois points (⋯) puis sur "Télécharger". Vous devrez accepter les conditions d''utilisation avant le téléchargement.', 'player', ARRAY['téléchargement', 'pro', 'enterprise'], 1),
('Quels formats audio sont supportés ?', 'Synaura supporte les formats MP3, WAV, FLAC et M4A. La taille maximale varie selon votre plan : Gratuit (50 MB), Starter (100 MB), Pro (200 MB), Enterprise (500 MB).', 'upload', ARRAY['formats', 'taille', 'limites'], 2),
('Comment fonctionne la génération de musique IA ?', 'Notre IA utilise les modèles Suno V4.5, V4.5+ et V5. Vous pouvez générer de la musique en mode Simple (prompt basique) ou Custom (paramètres avancés). Les générations sont gratuites et illimitées pour tous les utilisateurs.', 'ia', ARRAY['suno', 'génération', 'gratuit'], 3),
('Puis-je changer de plan d''abonnement ?', 'Oui, vous pouvez upgrader ou downgrader votre plan à tout moment depuis la page Abonnements. Les changements prennent effet immédiatement. En cas de downgrade, vos limites seront ajustées au prochain cycle de facturation.', 'abonnement', ARRAY['changement', 'upgrade', 'downgrade'], 4),
('Le player se ferme sur mobile, que faire ?', 'Ce problème peut survenir sur iOS. Assurez-vous que l''application est autorisée à jouer en arrière-plan dans les paramètres système. Redémarrez l''application et vérifiez que vous utilisez la dernière version.', 'technique', ARRAY['mobile', 'ios', 'arrière-plan'], 5),
('Comment partager mes musiques ?', 'Utilisez le bouton "Partager" dans le player (trois points ⋯). Cela génère un lien direct vers votre musique qui lancera automatiquement la lecture quand quelqu''un l''ouvre.', 'player', ARRAY['partage', 'lien', 'lecture'], 6),
('Mes musiques sont-elles protégées par des droits d''auteur ?', 'Oui, toutes les musiques uploadées passent par une vérification automatique des droits d''auteur via AudD. Si un conflit est détecté, l''upload sera bloqué pour protéger les créateurs.', 'upload', ARRAY['droits', 'protection', 'audd'], 7),
('Comment supprimer mon compte ?', 'Contactez notre support à support@synaura.fr avec votre demande de suppression. Nous traiterons votre demande dans les 48h et supprimerons toutes vos données conformément au RGPD.', 'general', ARRAY['compte', 'suppression', 'rgpd'], 8);
