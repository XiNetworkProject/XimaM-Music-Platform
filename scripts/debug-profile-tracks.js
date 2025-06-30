#!/usr/bin/env node

/**
 * Script de debug pour diagnostiquer pourquoi les tracks ne s'affichent pas dans le profil
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function debugProfileTracks() {
  console.log('🔍 Debug des tracks dans le profil\n');

  try {
    // Test 1: Vérifier l'API de profil
    console.log('1. Test de l\'API /api/users/[username]...');
    
    // Remplacer 'test-username' par un vrai username de votre base
    const username = process.argv[2] || 'test-username';
    console.log(`   Testing username: ${username}`);
    
    const profileResponse = await fetch(`${BASE_URL}/api/users/${username}`);
    const profileData = await profileResponse.json();
    
    console.log(`   Status: ${profileResponse.status}`);
    
    if (profileResponse.ok) {
      console.log(`   ✅ Profil trouvé: ${profileData.name}`);
      console.log(`   📊 Track count: ${profileData.trackCount}`);
      console.log(`   🎵 Tracks array length: ${profileData.tracks?.length || 0}`);
      
      if (profileData.tracks && profileData.tracks.length > 0) {
        console.log('   📋 Première track:');
        console.log(`      - ID: ${profileData.tracks[0]._id}`);
        console.log(`      - Titre: ${profileData.tracks[0].title}`);
        console.log(`      - Public: ${profileData.tracks[0].isPublic}`);
        console.log(`      - Featured: ${profileData.tracks[0].isFeatured}`);
      } else {
        console.log('   ❌ Aucune track trouvée dans le profil');
      }
    } else {
      console.log(`   ❌ Erreur profil: ${profileData.error}`);
    }

    // Test 2: Vérifier l'API des tracks
    console.log('\n2. Test de l\'API /api/tracks...');
    
    const tracksResponse = await fetch(`${BASE_URL}/api/tracks`);
    const tracksData = await tracksResponse.json();
    
    console.log(`   Status: ${tracksResponse.status}`);
    
    if (tracksResponse.ok) {
      console.log(`   📊 Total tracks dans la base: ${tracksData.tracks?.length || 0}`);
      
      if (tracksData.tracks && tracksData.tracks.length > 0) {
        console.log('   📋 Première track de la base:');
        console.log(`      - ID: ${tracksData.tracks[0]._id}`);
        console.log(`      - Titre: ${tracksData.tracks[0].title}`);
        console.log(`      - Artiste: ${tracksData.tracks[0].artist?.name || 'N/A'}`);
        console.log(`      - Public: ${tracksData.tracks[0].isPublic}`);
      }
    } else {
      console.log(`   ❌ Erreur tracks: ${tracksData.error}`);
    }

    // Test 3: Vérifier la structure de la base de données
    console.log('\n3. Vérification de la structure...');
    console.log('   🔍 Points à vérifier:');
    console.log('      - Les tracks ont-elles un champ artist valide?');
    console.log('      - Les tracks sont-elles associées à l\'utilisateur?');
    console.log('      - Le champ isPublic est-il défini?');
    console.log('      - Les ObjectIds sont-ils corrects?');

    console.log('\n📋 Instructions de debug:');
    console.log('1. Vérifiez dans MongoDB que les tracks ont bien un champ artist');
    console.log('2. Vérifiez que l\'utilisateur a bien des tracks dans son tableau tracks');
    console.log('3. Vérifiez que les tracks sont publiques (isPublic: true)');
    console.log('4. Vérifiez les logs du serveur pour d\'éventuelles erreurs');

  } catch (error) {
    console.error('❌ Erreur lors du debug:', error.message);
  }
}

// Exécuter le debug
if (require.main === module) {
  debugProfileTracks().catch(console.error);
}

module.exports = { debugProfileTracks }; 