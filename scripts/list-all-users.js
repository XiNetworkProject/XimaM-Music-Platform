const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listAllUsers() {
  try {
    console.log('👥 Liste de tous les utilisateurs...');
    
    // Récupérer tous les profils
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('❌ Erreur lors de la récupération des profils:', profilesError);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('❌ Aucun profil trouvé');
      return;
    }
    
    console.log(`✅ ${profiles.length} profils trouvés:\n`);
    
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ID: ${profile.id}`);
      console.log(`   Username: ${profile.username || 'N/A'}`);
      console.log(`   Name: ${profile.name || 'N/A'}`);
      console.log(`   Email: ${profile.email || 'N/A'}`);
      console.log(`   Artist: ${profile.is_artist ? 'OUI' : 'NON'}`);
      console.log(`   Artist Name: ${profile.artist_name || 'N/A'}`);
      console.log(`   Créé le: ${profile.created_at || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

listAllUsers();
