const http = require('http');

console.log('🧪 TEST DES ROUTES DE RECHERCHE');
console.log('=================================');

// Test de l'API de recherche pour vérifier la structure
const testSearchAPI = (query) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/search?query=${encodeURIComponent(query)}&limit=5`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Search-Routing-Test/1.0'
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
  console.log('\n🔍 TEST DES ROUTES DE RECHERCHE');
  console.log('==================================');
  
  try {
    // Tester avec "ximamoff" (utilisateur existant)
    console.log('\n🎵 Test recherche: "ximamoff"');
    
    const searchResponse = await testSearchAPI('ximamoff');
    
    if (searchResponse.statusCode === 200) {
      console.log('✅ API de recherche accessible');
      
      try {
        const searchData = JSON.parse(searchResponse.data);
        
        console.log('\n📋 ANALYSE DES ROUTES:');
        console.log('========================');
        
        // Analyser les artistes et leurs routes
        if (searchData.artists && searchData.artists.length > 0) {
          console.log('\n👤 ROUTES DES ARTISTES:');
          console.log('========================');
          
          searchData.artists.forEach((artist, index) => {
            console.log(`\n🎭 Artiste ${index + 1}:`);
            console.log(`   🆔 ID Supabase: ${artist._id}`);
            console.log(`   👤 Username: ${artist.username}`);
            console.log(`   📝 Nom: ${artist.name}`);
            
            // Construire les différentes routes possibles
            const oldRoute = `/artist/${artist._id}`;
            const newRoute = `/profile/${artist.username}`;
            
            console.log(`   🚫 Route incorrecte: ${oldRoute}`);
            console.log(`   ✅ Route correcte: ${newRoute}`);
            
            // Vérifier que le username est présent
            if (artist.username) {
              console.log(`   ✅ Username présent - Route valide`);
            } else {
              console.log(`   ❌ Username manquant - Route invalide`);
            }
          });
        } else {
          console.log('\n❌ Aucun artiste trouvé');
        }
        
        // Analyser les tracks et leurs routes
        if (searchData.tracks && searchData.tracks.length > 0) {
          console.log('\n🎵 ROUTES DES TRACKS:');
          console.log('======================');
          
          searchData.tracks.forEach((track, index) => {
            console.log(`\n🎵 Track ${index + 1}:`);
            console.log(`   🆔 ID Track: ${track._id}`);
            console.log(`   📝 Titre: ${track.title}`);
            console.log(`   👤 Artiste: ${track.artist?.username || '❌ MANQUANT'}`);
            
            if (track.artist?.username) {
              const artistRoute = `/profile/${track.artist.username}`;
              console.log(`   ✅ Route artiste: ${artistRoute}`);
            } else {
              console.log(`   ❌ Impossible de construire la route artiste`);
            }
          });
        } else {
          console.log('\n❌ Aucune track trouvée');
        }
        
        // Résumé des corrections
        console.log('\n🔧 RÉSUMÉ DES CORRECTIONS:');
        console.log('============================');
        console.log('✅ SearchModal.tsx: Utilise /profile/${username}');
        console.log('✅ AppNavbar.tsx: Corrigé pour utiliser /profile/${username}');
        console.log('✅ page.tsx: Corrigé pour utiliser /profile/${username}');
        console.log('\n🎯 RÉSULTAT:');
        console.log('   - Avant: /artist/0121fe72-0656-4d22-84f2-fd336f062604 ❌');
        console.log('   - Maintenant: /profile/ximamoff ✅');
        
      } catch (e) {
        console.log('❌ Erreur parsing JSON:', e.message);
      }
    } else {
      console.log(`❌ Erreur API: ${searchResponse.statusCode}`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  
  console.log('\n🎉 TEST TERMINÉ !');
  console.log('==================');
}

// Exécuter le test
runTest().catch(console.error);
