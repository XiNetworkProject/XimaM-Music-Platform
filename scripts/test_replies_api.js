const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRepliesAPI() {
  console.log('🧪 Test de l\'API replies...');

  try {
    // Test GET replies
    console.log('📥 Test GET replies...');
    const { data: replies, error: repliesError } = await supabase
      .from('forum_replies')
      .select('*')
      .eq('post_id', 'a1d49d48-0bab-4797-a968-984fb66623e1')
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('❌ Erreur GET replies:', repliesError);
    } else {
      console.log('✅ GET replies OK:', replies);
      
      // Récupérer les profils séparément
      if (replies && replies.length > 0) {
        const userIds = [...new Set(replies.map(reply => reply.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, username, avatar')
          .in('id', userIds);

        if (profilesError) {
          console.error('❌ Erreur profiles:', profilesError);
        } else {
          console.log('✅ Profiles OK:', profiles);
        }
      }
    }

    // Test POST reply
    console.log('📤 Test POST reply...');
    const { data: newReply, error: postError } = await supabase
      .from('forum_replies')
      .insert({
        post_id: 'a1d49d48-0bab-4797-a968-984fb66623e1',
        user_id: '00000000-0000-0000-0000-000000000000', // UUID de test
        content: 'Test commentaire'
      })
      .select('*')
      .single();

    if (postError) {
      console.error('❌ Erreur POST reply:', postError);
    } else {
      console.log('✅ POST reply OK:', newReply);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testRepliesAPI();
