const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPostCounters() {
  console.log('🧪 Test des compteurs de posts...');

  try {
    // Vérifier les posts existants
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('id, title, likes_count, replies_count')
      .limit(5);

    if (postsError) {
      console.error('❌ Erreur récupération posts:', postsError);
      return;
    }

    console.log('📝 Posts existants:');
    posts?.forEach(post => {
      console.log(`  - ${post.title}: ${post.likes_count} likes, ${post.replies_count} réponses`);
    });

    // Vérifier les likes réels
    if (posts && posts.length > 0) {
      const postId = posts[0].id;
      console.log(`\n❤️ Vérification des likes pour le post: ${postId}`);
      
      const { data: likes, error: likesError } = await supabase
        .from('forum_post_likes')
        .select('id, user_id')
        .eq('post_id', postId);

      if (likesError) {
        console.error('❌ Erreur récupération likes:', likesError);
      } else {
        console.log(`✅ Likes réels trouvés: ${likes?.length || 0}`);
      }

      // Vérifier les réponses réelles
      console.log(`\n💬 Vérification des réponses pour le post: ${postId}`);
      
      const { data: replies, error: repliesError } = await supabase
        .from('forum_replies')
        .select('id, user_id')
        .eq('post_id', postId);

      if (repliesError) {
        console.error('❌ Erreur récupération réponses:', repliesError);
      } else {
        console.log(`✅ Réponses réelles trouvées: ${replies?.length || 0}`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testPostCounters();
