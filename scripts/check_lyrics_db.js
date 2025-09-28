const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLyricsInDB() {
  try {
    console.log('🎵 Vérification des paroles dans la base de données...\n');
    
    // Récupérer les dernières pistes avec paroles
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, title, lyrics, created_at')
      .not('lyrics', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return;
    }

    if (!tracks || tracks.length === 0) {
      console.log('❌ Aucune piste avec paroles trouvée');
      return;
    }

    console.log(`✅ ${tracks.length} pistes avec paroles trouvées :\n`);

    tracks.forEach((track, index) => {
      console.log(`${index + 1}. ${track.title}`);
      console.log(`   ID: ${track.id}`);
      console.log(`   Paroles: ${track.lyrics ? '✅ Présentes' : '❌ Manquantes'}`);
      if (track.lyrics) {
        console.log(`   Longueur: ${track.lyrics.length} caractères`);
        console.log(`   Aperçu: ${track.lyrics.substring(0, 100)}...`);
      }
      console.log(`   Créée: ${new Date(track.created_at).toLocaleString()}`);
      console.log('');
    });

    // Vérifier aussi les pistes sans paroles
    const { data: tracksWithoutLyrics, error: error2 } = await supabase
      .from('tracks')
      .select('id, title, created_at')
      .is('lyrics', null)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!error2 && tracksWithoutLyrics && tracksWithoutLyrics.length > 0) {
      console.log(`📝 ${tracksWithoutLyrics.length} pistes sans paroles (exemples) :`);
      tracksWithoutLyrics.forEach((track, index) => {
        console.log(`   ${index + 1}. ${track.title} (${track.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter la vérification
checkLyricsInDB().then(() => {
  console.log('🎵 Vérification terminée');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
