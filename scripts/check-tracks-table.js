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

console.log('🔧 Configuration de vérification :');
console.log(`✅ Supabase URL: ${config.supabase.url ? 'Configuré' : '❌ Manquant'}`);
console.log(`✅ Supabase Service Key: ${config.supabase.serviceKey ? 'Configuré' : '❌ Manquant'}`);

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.error('❌ Configuration incomplète. Vérifiez vos variables d\'environnement.');
  process.exit(1);
}

// Initialiser Supabase avec la clé service (admin)
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function checkTracksTable() {
  console.log('\n🔍 VÉRIFICATION DE LA TABLE TRACKS');
  console.log('====================================');
  
  try {
    // 1. Vérifier si la table tracks existe
    console.log('\n1️⃣ Vérification de l\'existence de la table tracks...');
    
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .limit(1);
    
    if (tracksError) {
      console.log(`❌ Erreur accès table tracks: ${tracksError.message}`);
      console.log(`   📊 Code: ${tracksError.code}`);
      console.log(`   💡 Message: ${tracksError.details || 'Aucun détail'}`);
      
      // Vérifier si c'est une erreur de table inexistante
      if (tracksError.code === '42P01') {
        console.log('\n⚠️  La table tracks n\'existe pas !');
        console.log('💡 Il faut la créer dans Supabase');
        return;
      }
      
      return;
    }
    
    console.log(`✅ Table tracks accessible`);
    console.log(`📊 Nombre total de tracks: ${tracks?.length || 0}`);
    
    // 2. Vérifier la structure de la table
    console.log('\n2️⃣ Vérification de la structure de la table...');
    
    const { data: allTracks, error: allTracksError } = await supabase
      .from('tracks')
      .select('*')
      .limit(5);
    
    if (allTracksError) {
      console.log(`❌ Erreur récupération tracks: ${allTracksError.message}`);
      return;
    }
    
    if (allTracks && allTracks.length > 0) {
      console.log(`✅ ${allTracks.length} tracks récupérées`);
      
      // Afficher la première track pour voir la structure
      const firstTrack = allTracks[0];
      console.log('\n📋 Structure de la première track:');
      console.log(`   🆔 ID: ${firstTrack.id}`);
      console.log(`   📝 Titre: ${firstTrack.title}`);
      console.log(`   👤 User ID: ${firstTrack.user_id}`);
      console.log(`   🎵 Genre: ${JSON.stringify(firstTrack.genre)}`);
      console.log(`   📁 File Path: ${firstTrack.file_path}`);
      console.log(`   🔗 File URL: ${firstTrack.file_url}`);
      console.log(`   📊 Plays: ${firstTrack.plays}`);
      console.log(`   ❤️  Likes: ${firstTrack.likes}`);
      console.log(`   📅 Créé: ${firstTrack.created_at}`);
    } else {
      console.log('⚠️  Aucune track trouvée dans la table');
    }
    
    // 3. Vérifier les colonnes spécifiques
    console.log('\n3️⃣ Vérification des colonnes critiques...');
    
    const { data: columnsCheck, error: columnsError } = await supabase
      .from('tracks')
      .select('id, title, user_id, file_path, file_url, plays, likes, created_at')
      .limit(1);
    
    if (columnsError) {
      console.log(`❌ Erreur vérification colonnes: ${columnsError.message}`);
    } else {
      console.log('✅ Colonnes critiques accessibles');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  }
}

async function checkUserProfile(username) {
  console.log(`\n🔍 VÉRIFICATION DU PROFIL UTILISATEUR: ${username}`);
  console.log('================================================');
  
  try {
    // Vérifier le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    
    if (profileError || !profile) {
      console.log(`❌ Profil non trouvé pour: ${username}`);
      return null;
    }
    
    console.log(`✅ Profil trouvé: ${profile.name}`);
    console.log(`   🆔 ID: ${profile.id}`);
    console.log(`   📧 Email: ${profile.email}`);
    console.log(`   👤 Username: ${profile.username}`);
    
    return profile;
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du profil:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 DIAGNOSTIC DE LA TABLE TRACKS');
  console.log('==================================');
  
  try {
    // 1. Vérifier la table tracks
    await checkTracksTable();
    
    // 2. Vérifier le profil utilisateur ximamoff
    await checkUserProfile('ximamoff');
    
    console.log('\n🎉 DIAGNOSTIC TERMINÉ !');
    console.log('========================');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkTracksTable, checkUserProfile };
