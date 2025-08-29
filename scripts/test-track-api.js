const http = require('http');

console.log('🧪 TEST DE L\'API TRACKS/[ID]');
console.log('================================');

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

// Tester avec une track existante (ID de la première track du profil ximamoff)
async function runTest() {
  console.log('\n🔍 TEST DE L\'API TRACK');
  console.log('==========================');
  
  // ID d'une track existante (depuis le debug précédent)
  const testTrackId = '688e4afda519a3bd17607360'; // "La danse des lutins (Remix)"
  
  try {
    console.log(`🎵 Test avec la track: ${testTrackId}`);
    
    const trackResponse = await testTrackAPI(testTrackId);
    
    if (trackResponse.statusCode === 200) {
      console.log('✅ API track accessible');
      
      try {
        const trackData = JSON.parse(trackResponse.data);
        
        console.log('\n📋 DONNÉES DE LA TRACK:');
        console.log('========================');
        console.log(`🎵 Titre: ${trackData.title}`);
        console.log(`👤 Artiste: ${trackData.artist}`);
        console.log(`🖼️  Cover: ${trackData.coverUrl || '❌ MANQUANT'}`);
        console.log(`🎵 Audio: ${trackData.audioUrl || '❌ MANQUANT'}`);
        console.log(`⏱️  Durée: ${trackData.duration || '❌ MANQUANT'}`);
        console.log(`🎵 Genre: ${JSON.stringify(trackData.genre || [])}`);
        console.log(`📊 Plays: ${trackData.plays || 0}`);
        console.log(`❤️  Likes: ${trackData.likes || 0}`);
        console.log(`👑 Mise en vedette: ${trackData.isFeatured}`);
        console.log(`🌍 Public: ${trackData.isPublic}`);
        
        // Vérifier que les URLs sont présentes
        if (trackData.coverUrl && trackData.audioUrl) {
          console.log('\n✅ URLs présentes - La track peut être lue !');
        } else {
          console.log('\n❌ URLs manquantes - La track ne peut pas être lue');
        }
        
      } catch (e) {
        console.log('❌ Erreur parsing JSON:', e.message);
        console.log(`📄 Contenu brut: ${trackResponse.data.substring(0, 500)}...`);
      }
    } else {
      console.log(`❌ Erreur API: ${trackResponse.statusCode}`);
      console.log(`📄 Réponse: ${trackResponse.data}`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  
  console.log('\n🎉 TEST TERMINÉ !');
  console.log('==================');
}

// Exécuter le test
runTest().catch(console.error);
