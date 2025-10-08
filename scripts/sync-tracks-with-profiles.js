/**
 * Script pour synchroniser les tracks avec les profils actuels
 * Met à jour les noms d'artiste et avatars de toutes les tracks
 * 
 * Usage : node scripts/sync-tracks-with-profiles.js
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.local non trouvé');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes dans .env.local');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncTracksWithProfiles() {
  console.log('🔄 Synchronisation des tracks avec les profils...\n');
  console.log('═'.repeat(80) + '\n');

  try {
    // Récupérer tous les profils
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, username, avatar');

    if (profilesError || !profiles) {
      console.error('❌ Erreur lors de la récupération des profils:', profilesError);
      process.exit(1);
    }

    console.log(`📋 ${profiles.length} profil(s) trouvé(s)\n`);

    // Créer une map pour un accès rapide
    const profilesMap = new Map(profiles.map(p => [p.id, p]));

    // Récupérer toutes les tracks avec leurs créateurs
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, title, creator_id');

    if (tracksError || !tracks) {
      console.error('❌ Erreur lors de la récupération des tracks:', tracksError);
      process.exit(1);
    }

    console.log(`🎵 ${tracks.length} track(s) trouvée(s)\n`);

    let checked = 0;
    let profilesInfo = {};

    // Analyser chaque track et afficher les infos actuelles
    for (const track of tracks) {
      const profile = profilesMap.get(track.creator_id);

      if (!profile) {
        console.log(`⚠️  Track "${track.title}" - Profil créateur non trouvé (creator_id: ${track.creator_id})`);
        continue;
      }

      if (!profilesInfo[profile.id]) {
        profilesInfo[profile.id] = {
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar,
          trackCount: 0
        };
      }
      
      profilesInfo[profile.id].trackCount++;
      checked++;
    }

    console.log('📊 Résumé des artistes et leurs tracks :');
    console.log('═'.repeat(80));
    
    Object.entries(profilesInfo).forEach(([id, info]) => {
      console.log(`\n👤 ${info.name} (@${info.username})`);
      console.log(`   📝 ${info.trackCount} track(s)`);
      console.log(`   🖼️  Avatar: ${info.avatar || '(aucun)'}`);
    });

    // Résumé
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Analyse terminée !');
    console.log(`   📝 Total tracks analysées : ${tracks.length}`);
    console.log(`   👥 Total artistes : ${Object.keys(profilesInfo).length}`);
    console.log('\nℹ️  Note : Les noms d\'artiste et avatars sont récupérés dynamiquement');
    console.log('   depuis la table profiles à chaque requête. Aucune mise à jour');
    console.log('   de la table tracks n\'est nécessaire.\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

syncTracksWithProfiles();

