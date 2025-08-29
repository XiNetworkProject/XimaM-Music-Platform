const http = require('http');

console.log('🧪 TEST DE L\'INTERFACE DU PROFIL');
console.log('==================================');

// Test de l'API profil pour vérifier la structure des données
const testProfileAPI = (username) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/users/${username}`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Profile-Interface-Test/1.0'
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

// Test de l'API track individuelle
const testTrackAPI = (trackId) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/tracks/${trackId}`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Track-API-Test/1.0'
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

async function runTest() {
  console.log('\n🔍 TEST DE L\'INTERFACE DU PROFIL');
  console.log('====================================');
  
  try {
    // 1. Tester l'API profil
    console.log('\n📋 TEST API PROFIL:');
    console.log('====================');
    
    const profileResponse = await testProfileAPI('ximamoff');
    
    if (profileResponse.statusCode === 200) {
      console.log('✅ API profil accessible');
      
      try {
        const profileData = JSON.parse(profileResponse.data);
        
        // Vérifier la structure des tracks
        if (profileData.tracks && Array.isArray(profileData.tracks)) {
          console.log(`✅ ${profileData.tracks.length} tracks trouvées`);
          
          const firstTrack = profileData.tracks[0];
          console.log('\n🎵 PREMIÈRE TRACK:');
          console.log(`   📝 Titre: ${firstTrack.title}`);
          console.log(`   🖼️  Cover: ${firstTrack.cover_url || '❌ MANQUANT'}`);
          console.log(`   🎵 Audio: ${firstTrack.audio_url || '❌ MANQUANT'}`);
          
          // 2. Tester l'API track individuelle
          if (firstTrack.id) {
            console.log('\n🎵 TEST API TRACK INDIVIDUELLE:');
            console.log('================================');
            
            const trackResponse = await testTrackAPI(firstTrack.id);
            
            if (trackResponse.statusCode === 200) {
              console.log('✅ API track individuelle accessible');
              
              try {
                const trackData = JSON.parse(trackResponse.data);
                
                console.log('\n📋 DONNÉES TRACK FORMATÉES:');
                console.log('==============================');
                console.log(`🎵 Titre: ${trackData.title}`);
                console.log(`👤 Artiste: ${trackData.artist}`);
                console.log(`🖼️  Cover: ${trackData.coverUrl || '❌ MANQUANT'}`);
                console.log(`🎵 Audio: ${trackData.audioUrl || '❌ MANQUANT'}`);
                
                // Vérifier la compatibilité avec l'interface
                if (trackData.coverUrl && trackData.audioUrl) {
                  console.log('\n✅ Interface compatible - La track peut être lue !');
                } else {
                  console.log('\n❌ Interface incompatible - Problème de formatage');
                }
                
              } catch (e) {
                console.log('❌ Erreur parsing track JSON:', e.message);
              }
            } else {
              console.log(`❌ Erreur API track: ${trackResponse.statusCode}`);
            }
          }
        } else {
          console.log('❌ Aucune track trouvée dans le profil');
        }
        
      } catch (e) {
        console.log('❌ Erreur parsing profil JSON:', e.message);
      }
    } else {
      console.log(`❌ Erreur API profil: ${profileResponse.statusCode}`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  
  console.log('\n🎉 TEST TERMINÉ !');
  console.log('==================');
}

// Exécuter le test
runTest().catch(console.error);
