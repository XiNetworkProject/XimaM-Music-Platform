const http = require('http');

console.log('🧪 TEST DE L\'API DE RECHERCHE');
console.log('================================');

// Test de l'API de recherche
const testSearchAPI = (query) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/search?query=${encodeURIComponent(query)}&limit=5`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Search-API-Test/1.0'
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
  console.log('\n🔍 TEST DE L\'API DE RECHERCHE');
  console.log('================================');
  
  try {
    // Tester avec "ximamoff" (utilisateur existant)
    console.log('\n🎵 Test recherche: "ximamoff"');
    
    const searchResponse = await testSearchAPI('ximamoff');
    
    if (searchResponse.statusCode === 200) {
      console.log('✅ API de recherche accessible');
      
      try {
        const searchData = JSON.parse(searchResponse.data);
        
        console.log('\n📋 RÉSULTATS DE RECHERCHE:');
        console.log('============================');
        console.log(`🔍 Query: ${searchData.query}`);
        console.log(`📊 Total: ${searchData.totalResults} résultats`);
        
        // Analyser les artistes
        if (searchData.artists && searchData.artists.length > 0) {
          console.log('\n👤 ARTISTES TROUVÉS:');
          console.log('======================');
          
          searchData.artists.forEach((artist, index) => {
            console.log(`\n🎭 Artiste ${index + 1}:`);
            console.log(`   🆔 ID: ${artist._id}`);
            console.log(`   👤 Username: ${artist.username || '❌ MANQUANT'}`);
            console.log(`   📝 Nom: ${artist.name || '❌ MANQUANT'}`);
            console.log(`   🎭 Artiste: ${artist.isArtist ? 'Oui' : 'Non'}`);
            console.log(`   🖼️  Avatar: ${artist.avatar || '❌ MANQUANT'}`);
            
            // Vérifier la cohérence des données
            if (artist.username) {
              console.log(`   ✅ Username présent - URL: /profile/${artist.username}`);
            } else {
              console.log(`   ❌ Username manquant - Impossible de construire l'URL`);
            }
          });
        } else {
          console.log('\n❌ Aucun artiste trouvé');
        }
        
        // Analyser les tracks
        if (searchData.tracks && searchData.tracks.length > 0) {
          console.log('\n🎵 TRACKS TROUVÉES:');
          console.log('====================');
          
          searchData.tracks.forEach((track, index) => {
            console.log(`\n🎵 Track ${index + 1}:`);
            console.log(`   🆔 ID: ${track._id}`);
            console.log(`   📝 Titre: ${track.title}`);
            console.log(`   👤 Artiste: ${track.artist?.username || '❌ MANQUANT'}`);
            console.log(`   🎭 Nom artiste: ${track.artist?.name || '❌ MANQUANT'}`);
            
            // Vérifier la cohérence des données
            if (track.artist?.username) {
              console.log(`   ✅ Username artiste présent - URL: /profile/${track.artist.username}`);
            } else {
              console.log(`   ❌ Username artiste manquant`);
            }
          });
        } else {
          console.log('\n❌ Aucune track trouvée');
        }
        
        // Vérifier la structure des données
        console.log('\n🔍 VÉRIFICATION DE LA STRUCTURE:');
        console.log('==================================');
        
        const hasUsernameInArtists = searchData.artists?.some(artist => artist.username);
        const hasUsernameInTracks = searchData.tracks?.some(track => track.artist?.username);
        
        if (hasUsernameInArtists) {
          console.log('✅ Usernames présents dans les artistes');
        } else {
          console.log('❌ Usernames manquants dans les artistes');
        }
        
        if (hasUsernameInTracks) {
          console.log('✅ Usernames présents dans les tracks');
        } else {
          console.log('❌ Usernames manquants dans les tracks');
        }
        
      } catch (e) {
        console.log('❌ Erreur parsing JSON:', e.message);
        console.log(`📄 Contenu brut: ${searchResponse.data.substring(0, 500)}...`);
      }
    } else {
      console.log(`❌ Erreur API: ${searchResponse.statusCode}`);
      console.log(`📄 Réponse: ${searchResponse.data}`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  
  console.log('\n🎉 TEST TERMINÉ !');
  console.log('==================');
}

// Exécuter le test
runTest().catch(console.error);
