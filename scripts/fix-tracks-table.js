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

console.log('🔧 Configuration de correction de la table tracks :');
console.log(`✅ Supabase URL: ${config.supabase.url ? 'Configuré' : '❌ Manquant'}`);
console.log(`✅ Supabase Service Key: ${config.supabase.serviceKey ? 'Configuré' : '❌ Manquant'}`);

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.error('❌ Configuration incomplète. Vérifiez vos variables d\'environnement.');
  process.exit(1);
}

// Initialiser Supabase avec la clé service (admin)
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function fixTracksTable() {
  console.log('\n🔧 CORRECTION DE LA TABLE TRACKS');
  console.log('==================================');
  
  try {
    // 1. Vérifier la structure actuelle
    console.log('\n1️⃣ Vérification de la structure actuelle...');
    
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*')
      .limit(5);
    
    if (tracksError) {
      console.log(`❌ Erreur accès table tracks: ${tracksError.message}`);
      return;
    }
    
    console.log(`📊 ${tracks?.length || 0} tracks trouvées`);
    
    if (tracks && tracks.length > 0) {
      const firstTrack = tracks[0];
      console.log('\n📋 Structure actuelle de la première track:');
      console.log(`   🆔 ID: ${firstTrack.id}`);
      console.log(`   📝 Titre: ${firstTrack.title}`);
      console.log(`   📊 Plays: ${firstTrack.plays}`);
      console.log(`   ❤️  Likes: ${firstTrack.likes}`);
      console.log(`   📅 Créé: ${firstTrack.created_at}`);
      
      // Afficher toutes les colonnes disponibles
      console.log('\n📋 Colonnes disponibles:');
      Object.keys(firstTrack).forEach(key => {
        console.log(`   • ${key}: ${typeof firstTrack[key]} = ${JSON.stringify(firstTrack[key])}`);
      });
    }
    
    // 2. Créer une nouvelle table tracks avec la bonne structure
    console.log('\n2️⃣ Création d\'une nouvelle table tracks...');
    
    // Note: Nous ne pouvons pas créer/modifier des tables via l'API Supabase depuis Node.js
    // Il faut le faire manuellement dans le dashboard Supabase
    
    console.log('⚠️  ATTENTION: La création/modification de tables doit se faire manuellement');
    console.log('💡 Allez dans votre dashboard Supabase > Table Editor > tracks');
    console.log('🔧 Ajoutez les colonnes manquantes:');
    console.log('   • user_id (uuid, foreign key vers profiles.id)');
    console.log('   • file_path (text)');
    console.log('   • file_url (text)');
    console.log('   • file_size (bigint)');
    console.log('   • file_type (text)');
    console.log('   • duration (integer)');
    console.log('   • is_public (boolean, default: true)');
    console.log('   • description (text)');
    
    // 3. Vérifier si les colonnes existent maintenant
    console.log('\n3️⃣ Vérification des nouvelles colonnes...');
    
    try {
      const { data: newTracks, error: newTracksError } = await supabase
        .from('tracks')
        .select('id, title, user_id, file_path, file_url, plays, likes, created_at')
        .limit(1);
      
      if (newTracksError) {
        console.log(`❌ Colonnes manquantes: ${newTracksError.message}`);
        console.log('\n💡 Créez d\'abord les colonnes manquantes dans Supabase');
        return;
      }
      
      console.log('✅ Nouvelles colonnes accessibles');
      
    } catch (error) {
      console.log(`❌ Erreur vérification colonnes: ${error.message}`);
      console.log('\n💡 Créez d\'abord les colonnes manquantes dans Supabase');
      return;
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
  }
}

async function createSampleTrack() {
  console.log('\n🎵 CRÉATION D\'UNE TRACK D\'EXEMPLE');
  console.log('====================================');
  
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
    
    // Créer une track d'exemple
    const { data: newTrack, error: trackError } = await supabase
      .from('tracks')
      .insert({
        title: 'Track d\'exemple - Test API',
        description: 'Track créée pour tester l\'API',
        genre: ['test'],
        user_id: profile.id,
        file_path: 'uploads/ximamoff/example.mp3',
        file_url: 'https://example.com/audio.mp3',
        file_size: 1024000, // 1MB
        file_type: 'audio/mpeg',
        duration: 180, // 3 minutes
        is_public: true,
        plays: 0,
        likes: 0
      })
      .select()
      .single();
    
    if (trackError) {
      console.log(`❌ Erreur création track: ${trackError.message}`);
      console.log('💡 Vérifiez que toutes les colonnes existent dans la table tracks');
      return;
    }
    
    console.log(`✅ Track créée avec succès: ${newTrack.id}`);
    console.log(`   📝 Titre: ${newTrack.title}`);
    console.log(`   👤 User ID: ${newTrack.user_id}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de la track:', error.message);
  }
}

async function main() {
  console.log('🚀 CORRECTION DE LA STRUCTURE DE LA TABLE TRACKS');
  console.log('================================================');
  
  try {
    // 1. Diagnostiquer et corriger la table
    await fixTracksTable();
    
    // 2. Créer une track d'exemple (si la structure est correcte)
    await createSampleTrack();
    
    console.log('\n🎉 CORRECTION TERMINÉE !');
    console.log('==========================');
    console.log('\n💡 PROCHAINES ÉTAPES:');
    console.log('1. Allez dans votre dashboard Supabase');
    console.log('2. Modifiez la table tracks pour ajouter les colonnes manquantes');
    console.log('3. Relancez ce script pour tester');
    console.log('4. L\'API upload devrait fonctionner');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixTracksTable, createSampleTrack };
