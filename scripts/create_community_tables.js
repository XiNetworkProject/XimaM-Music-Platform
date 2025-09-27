const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCommunityTables() {
  console.log('🚀 Création des tables de communauté...');

  try {
    // Table des posts du forum
    console.log('📝 Création de la table forum_posts...');
    const { error: postsError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (postsError) {
      console.error('❌ Erreur création forum_posts:', postsError);
    } else {
      console.log('✅ Table forum_posts créée');
    }

    // Table des réponses
    console.log('💬 Création de la table forum_replies...');
    const { error: repliesError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (repliesError) {
      console.error('❌ Erreur création forum_replies:', repliesError);
    } else {
      console.log('✅ Table forum_replies créée');
    }

    // Table des likes sur les posts
    console.log('❤️ Création de la table forum_post_likes...');
    const { error: postLikesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS forum_post_likes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(post_id, user_id)
        );
      `
    });

    if (postLikesError) {
      console.error('❌ Erreur création forum_post_likes:', postLikesError);
    } else {
      console.log('✅ Table forum_post_likes créée');
    }

    // Table des likes sur les réponses
    console.log('💕 Création de la table forum_reply_likes...');
    const { error: replyLikesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS forum_reply_likes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          reply_id UUID NOT NULL REFERENCES forum_replies(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(reply_id, user_id)
        );
      `
    });

    if (replyLikesError) {
      console.error('❌ Erreur création forum_reply_likes:', replyLikesError);
    } else {
      console.log('✅ Table forum_reply_likes créée');
    }

    // Table des FAQ
    console.log('❓ Création de la table faq_items...');
    const { error: faqError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (faqError) {
      console.error('❌ Erreur création faq_items:', faqError);
    } else {
      console.log('✅ Table faq_items créée');
    }

    // Table des votes FAQ
    console.log('🗳️ Création de la table faq_votes...');
    const { error: faqVotesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS faq_votes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          faq_id UUID NOT NULL REFERENCES faq_items(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          is_helpful BOOLEAN NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(faq_id, user_id)
        );
      `
    });

    if (faqVotesError) {
      console.error('❌ Erreur création faq_votes:', faqVotesError);
    } else {
      console.log('✅ Table faq_votes créée');
    }

    console.log('🎉 Toutes les tables de communauté ont été créées !');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

createCommunityTables();
