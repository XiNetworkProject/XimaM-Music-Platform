// scripts/check_remaining_data.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRemainingData() {
  try {
    console.log('🔍 Vérification des données restantes...');
    
    const testUserId = '1d8a92fa-ddfb-460a-b38e-e9d563b4e32f';
    
    // Vérifier toutes les tables possibles
    const tablesToCheck = [
      'users',
      'comments',
      'ai_generations',
      'ai_tracks',
      'notifications',
      'track_likes',
      'user_follows',
      'playlists',
      'tracks',
      'messages'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', testUserId);
        
        if (error) {
          console.log(`⚠️ Table ${table}: ${error.message}`);
        } else if (data && data.length > 0) {
          console.log(`❌ Table ${table}: ${data.length} enregistrements trouvés`);
          console.log(`   Données:`, data);
        } else {
          console.log(`✅ Table ${table}: Aucune donnée trouvée`);
        }
      } catch (err) {
        console.log(`⚠️ Table ${table}: Erreur d'accès`);
      }
    }
    
    // Vérifier aussi par artist_id pour les tracks
    try {
      const { data: tracksByArtist, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('artist_id', testUserId);
      
      if (tracksError) {
        console.log(`⚠️ Tracks par artist_id: ${tracksError.message}`);
      } else if (tracksByArtist && tracksByArtist.length > 0) {
        console.log(`❌ Tracks par artist_id: ${tracksByArtist.length} tracks trouvées`);
        console.log(`   Tracks:`, tracksByArtist);
      } else {
        console.log(`✅ Tracks par artist_id: Aucune track trouvée`);
      }
    } catch (err) {
      console.log(`⚠️ Tracks par artist_id: Erreur d'accès`);
    }
    
    // Vérifier les sessions de connexion
    console.log('\n🔐 Vérification des sessions...');
    try {
      const { data: sessions, error: sessionsError } = await supabase.auth.admin.listUsers();
      
      if (sessionsError) {
        console.log(`⚠️ Sessions: ${sessionsError.message}`);
      } else {
        const testUserSession = sessions.users.find(user => user.email === 'test@example.com');
        if (testUserSession) {
          console.log(`❌ Session trouvée pour test@example.com:`, testUserSession);
        } else {
          console.log(`✅ Aucune session trouvée pour test@example.com`);
        }
      }
    } catch (err) {
      console.log(`⚠️ Sessions: Erreur d'accès`);
    }
    
    console.log('\n📋 Résumé:');
    console.log('Si des données restent, elles peuvent causer l\'affichage de l\'utilisateur test.');
    console.log('Vérifiez aussi le cache de votre navigateur et redémarrez l\'application.');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
checkRemainingData().then(() => {
  console.log('🏁 Vérification terminée');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
