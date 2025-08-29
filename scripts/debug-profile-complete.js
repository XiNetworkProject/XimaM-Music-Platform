const http = require('http');

console.log('🔍 DEBUG COMPLET DU PROFIL');
console.log('===========================');

// Test de l'API profil utilisateur avec analyse détaillée
const testProfileAPI = (username) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/users/${username}`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Profile-Debug/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
};

// Tester avec l'utilisateur ximamoff
async function runDebug() {
  console.log('\n🔍 ANALYSE COMPLÈTE DU PROFIL');
  console.log('================================');
  
  try {
    const profileResponse = await testProfileAPI('ximamoff');
    
    if (profileResponse.statusCode === 200) {
      console.log('✅ API profil accessible');
      
      try {
        const profileData = JSON.parse(profileResponse.data);
        
        console.log('\n📋 PROFIL UTILISATEUR:');
        console.log('======================');
        console.log(`👤 Nom: ${profileData.name}`);
        console.log(`📧 Email: ${profileData.email}`);
        console.log(`🖼️  Avatar: ${profileData.avatar || '❌ MANQUANT'}`);
        console.log(`🎨 Bannière: ${profileData.banner || '❌ MANQUANT'}`);
        console.log(`📝 Bio: ${profileData.bio || '❌ MANQUANT'}`);
        console.log(`🎵 Genre: ${JSON.stringify(profileData.genre || [])}`);
        console.log(`👑 Rôle: ${profileData.role}`);
        console.log(`✅ Vérifié: ${profileData.isVerified}`);
        console.log(`🎭 Artiste: ${profileData.isArtist}`);
        
        console.log('\n📊 STATISTIQUES:');
        console.log('=================');
        console.log(`🎵 Tracks: ${profileData.tracksCount}`);
        console.log(`📚 Playlists: ${profileData.playlistsCount}`);
        console.log(`📊 Total Plays: ${profileData.totalPlays}`);
        console.log(`❤️  Total Likes: ${profileData.totalLikes}`);
        
        // Analyser les tracks en détail
        if (profileData.tracks && Array.isArray(profileData.tracks)) {
          console.log('\n🎵 ANALYSE DES TRACKS:');
          console.log('=======================');
          console.log(`📁 Nombre de tracks: ${profileData.tracks.length}`);
          
          profileData.tracks.forEach((track, index) => {
            console.log(`\n🎵 Track ${index + 1}:`);
            console.log(`   📝 Titre: ${track.title}`);
            console.log(`   🆔 ID: ${track.id}`);
            console.log(`   🖼️  Cover: ${track.cover_url || track.coverUrl || '❌ MANQUANT'}`);
            console.log(`   🎵 Audio: ${track.audio_url || track.audioUrl || '❌ MANQUANT'}`);
            console.log(`   📊 Plays: ${track.plays || 0}`);
            console.log(`   ❤️  Likes: ${track.likes || 0}`);
            console.log(`   ⏱️  Durée: ${track.duration || '❌ MANQUANT'}`);
            console.log(`   🎵 Genre: ${JSON.stringify(track.genre || [])}`);
            console.log(`   👑 Mise en vedette: ${track.is_featured || track.isFeatured || false}`);
            console.log(`   🌍 Public: ${track.is_public || track.isPublic || true}`);
            console.log(`   📅 Créé: ${track.created_at || track.createdAt}`);
            console.log(`   🔄 Mis à jour: ${track.updated_at || track.updatedAt}`);
            
            // Vérifier la structure des likes
            if (track.likes && typeof track.likes === 'object') {
              console.log(`   💡 Structure likes: ${typeof track.likes} - ${JSON.stringify(track.likes)}`);
            } else if (track.likes !== undefined) {
              console.log(`   💡 Type likes: ${typeof track.likes} - Valeur: ${track.likes}`);
            } else {
              console.log(`   💡 Likes: undefined/null`);
            }
          });
        } else {
          console.log('\n❌ AUCUNE TRACK INCLUSE DANS LE PROFIL');
        }
        
        // Analyser les playlists
        if (profileData.playlists && Array.isArray(profileData.playlists)) {
          console.log('\n📚 ANALYSE DES PLAYLISTS:');
          console.log('==========================');
          console.log(`📁 Nombre de playlists: ${profileData.playlists.length}`);
          
          profileData.playlists.forEach((playlist, index) => {
            console.log(`\n📚 Playlist ${index + 1}:`);
            console.log(`   📝 Nom: ${playlist.name}`);
            console.log(`   🆔 ID: ${playlist.id}`);
            console.log(`   🎵 Tracks: ${playlist.tracks_count || playlist.tracksCount || 0}`);
          });
        } else {
          console.log('\n❌ AUCUNE PLAYLIST INCLUSE DANS LE PROFIL');
        }
        
        console.log('\n🔍 PROBLÈMES IDENTIFIÉS:');
        console.log('==========================');
        
        // Vérifier les problèmes
        const problems = [];
        
        if (!profileData.banner) problems.push('❌ Bannière manquante');
        if (!profileData.bio) problems.push('❌ Bio manquante');
        if (!profileData.tracks || profileData.tracks.length === 0) problems.push('❌ Tracks non incluses');
        if (!profileData.playlists || profileData.playlists.length === 0) problems.push('❌ Playlists non incluses');
        
        // Vérifier la structure des tracks
        if (profileData.tracks && profileData.tracks.length > 0) {
          const firstTrack = profileData.tracks[0];
          if (!firstTrack.cover_url && !firstTrack.coverUrl) problems.push('❌ Covers des tracks manquantes');
          if (!firstTrack.audio_url && !firstTrack.audioUrl) problems.push('❌ URLs audio des tracks manquantes');
          if (firstTrack.likes === undefined || firstTrack.likes === null) problems.push('❌ Structure des likes incorrecte');
        }
        
        if (problems.length === 0) {
          console.log('✅ Aucun problème majeur détecté');
        } else {
          problems.forEach(problem => console.log(problem));
        }
        
      } catch (e) {
        console.log('❌ Erreur parsing JSON:', e.message);
        console.log(`📄 Contenu brut: ${profileResponse.data.substring(0, 500)}...`);
      }
    } else {
      console.log(`❌ Erreur API: ${profileResponse.statusCode}`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  
  console.log('\n🎉 DEBUG TERMINÉ !');
  console.log('==================');
}

// Exécuter le debug
runDebug().catch(console.error);
