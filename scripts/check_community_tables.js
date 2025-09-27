const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTablesExist() {
  console.log('🔍 Vérification de l\'existence des tables...');

  try {
    // Vérifier forum_posts
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('id')
      .limit(1);

    if (postsError) {
      console.log('❌ Table forum_posts n\'existe pas:', postsError.message);
    } else {
      console.log('✅ Table forum_posts existe');
    }

    // Vérifier forum_replies
    const { data: replies, error: repliesError } = await supabase
      .from('forum_replies')
      .select('id')
      .limit(1);

    if (repliesError) {
      console.log('❌ Table forum_replies n\'existe pas:', repliesError.message);
    } else {
      console.log('✅ Table forum_replies existe');
    }

    // Vérifier forum_post_likes
    const { data: postLikes, error: postLikesError } = await supabase
      .from('forum_post_likes')
      .select('id')
      .limit(1);

    if (postLikesError) {
      console.log('❌ Table forum_post_likes n\'existe pas:', postLikesError.message);
    } else {
      console.log('✅ Table forum_post_likes existe');
    }

    // Vérifier faq_items
    const { data: faq, error: faqError } = await supabase
      .from('faq_items')
      .select('id')
      .limit(1);

    if (faqError) {
      console.log('❌ Table faq_items n\'existe pas:', faqError.message);
    } else {
      console.log('✅ Table faq_items existe');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

checkTablesExist();
