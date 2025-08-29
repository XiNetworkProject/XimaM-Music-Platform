const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Charger manuellement .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#')) {
        const value = valueParts.join('=').trim();
        if (value) {
          envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    
    Object.assign(process.env, envVars);
    console.log('✅ Fichier .env.local chargé manuellement');
  } else {
    console.log('⚠️  Fichier .env.local non trouvé');
  }
}

loadEnvFile();

// Configuration
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};

console.log('🔧 VÉRIFICATION DE LA TABLE PLAYLISTS');
console.log('======================================');

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.error('❌ Configuration incomplète. Vérifiez vos variables d\'environnement.');
  process.exit(1);
}

// Initialiser Supabase avec la clé service (admin)
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function checkPlaylistsTable() {
  try {
    console.log('\n🔍 VÉRIFICATION DE LA TABLE PLAYLISTS');
    console.log('======================================');
    
    // 1. Vérifier si la table playlists existe
    const { data: playlists, error: playlistsError } = await supabase
      .from('playlists')
      .select('*')
      .limit(5);
    
    if (playlistsError) {
      console.log(`❌ Erreur accès table playlists: ${playlistsError.message}`);
      console.log(`   📊 Code: ${playlistsError.code}`);
      
      if (playlistsError.code === '42P01') {
        console.log('\n⚠️  La table playlists n\'existe pas !');
        console.log('💡 Il faut la créer dans Supabase');
        return;
      }
      return;
    }
    
    console.log(`✅ Table playlists accessible`);
    console.log(`📊 Nombre de playlists: ${playlists?.length || 0}`);
    
    if (playlists && playlists.length > 0) {
      console.log('\n📋 Structure de la première playlist:');
      const firstPlaylist = playlists[0];
      console.log(`   🆔 ID: ${firstPlaylist.id}`);
      console.log(`   📝 Nom: ${firstPlaylist.name}`);
      console.log(`   👤 Creator ID: ${firstPlaylist.creator_id || firstPlaylist.user_id || 'Non défini'}`);
      console.log(`   🎵 Tracks: ${firstPlaylist.tracks_count || firstPlaylist.tracksCount || 0}`);
      console.log(`   📅 Créé: ${firstPlaylist.created_at || firstPlaylist.createdAt}`);
      
      // Afficher toutes les colonnes disponibles
      console.log('\n📋 Colonnes disponibles:');
      Object.keys(firstPlaylist).forEach(key => {
        console.log(`   • ${key}: ${typeof firstPlaylist[key]} = ${JSON.stringify(firstPlaylist[key])}`);
      });
    } else {
      console.log('⚠️  Aucune playlist trouvée dans la table');
    }
    
    // 2. Vérifier la structure de la table
    console.log('\n🔍 VÉRIFICATION DE LA STRUCTURE');
    console.log('================================');
    
    try {
      const { data: structureCheck, error: structureError } = await supabase
        .from('playlists')
        .select('id, name, creator_id, user_id, tracks_count, created_at')
        .limit(1);
      
      if (structureError) {
        console.log(`❌ Erreur vérification structure: ${structureError.message}`);
      } else {
        console.log('✅ Colonnes de base accessibles');
      }
    } catch (error) {
      console.log(`❌ Erreur structure: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  }
}

async function createSamplePlaylist() {
  console.log('\n🎵 CRÉATION D\'UNE PLAYLIST D\'EXEMPLE');
  console.log('======================================');
  
  try {
    // Vérifier que l'utilisateur ximamoff existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'ximamoff')
      .single();
    
    if (profileError || !profile) {
      console.log('❌ Profil ximamoff non trouvé');
      return;
    }
    
    console.log(`✅ Profil trouvé: ${profile.id}`);
    
    // Créer une playlist d'exemple
    const { data: newPlaylist, error: playlistError } = await supabase
      .from('playlists')
      .insert({
        name: 'Ma première playlist - Test',
        description: 'Playlist créée pour tester l\'API',
        creator_id: profile.id,
        tracks_count: 0,
        is_public: true
      })
      .select()
      .single();
    
    if (playlistError) {
      console.log(`❌ Erreur création playlist: ${playlistError.message}`);
      console.log('💡 Vérifiez que la table playlists existe et a la bonne structure');
      return;
    }
    
    console.log(`✅ Playlist créée avec succès: ${newPlaylist.id}`);
    console.log(`   📝 Nom: ${newPlaylist.name}`);
    console.log(`   👤 Creator ID: ${newPlaylist.creator_id}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de la playlist:', error.message);
  }
}

async function main() {
  try {
    // 1. Vérifier la table playlists
    await checkPlaylistsTable();
    
    // 2. Créer une playlist d'exemple (si la structure est correcte)
    await createSamplePlaylist();
    
    console.log('\n🎉 VÉRIFICATION TERMINÉE !');
    console.log('============================');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkPlaylistsTable, createSamplePlaylist };
