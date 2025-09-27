-- Désactiver temporairement RLS pour permettre le fonctionnement du forum
-- TODO: Réactiver RLS une fois l'authentification Supabase configurée

ALTER TABLE forum_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reply_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE faq_votes DISABLE ROW LEVEL SECURITY;
