const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfilesTable() {
  console.log('🔍 Vérification de la table profiles...');

  try {
    // Vérifier si on peut joindre profiles avec auth.users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, username, avatar')
      .limit(1);

    if (profilesError) {
      console.error('❌ Erreur profiles:', profilesError);
    } else {
      console.log('✅ Table profiles accessible:', profiles);
    }

    // Test avec une jointure manuelle
    console.log('🔗 Test jointure manuelle...');
    const { data: replies, error: repliesError } = await supabase
      .from('forum_replies')
      .select(`
        *,
        profiles!forum_replies_user_id_fkey (
          id,
          name,
          username,
          avatar
        )
      `)
      .limit(1);

    if (repliesError) {
      console.error('❌ Erreur jointure manuelle:', repliesError);
    } else {
      console.log('✅ Jointure manuelle OK:', replies);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkProfilesTable();
