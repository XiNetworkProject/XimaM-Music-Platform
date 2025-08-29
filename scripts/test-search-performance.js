const http = require('http');

console.log('⚡ TEST DE PERFORMANCE DE LA RECHERCHE OPTIMISÉE');
console.log('==================================================');

// Test de performance de l'API de recherche
const testSearchPerformance = (query) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/search?query=${encodeURIComponent(query)}&limit=5`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Search-Performance-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          duration: duration
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
};

async function runPerformanceTest() {
  console.log('\n🔍 TEST DE PERFORMANCE DE LA RECHERCHE');
  console.log('========================================');
  
  try {
    // Test avec "ximamoff" (utilisateur existant)
    console.log('\n🎵 Test recherche: "ximamoff"');
    
    const searchResponse = await testSearchPerformance('ximamoff');
    
    if (searchResponse.statusCode === 200) {
      console.log(`✅ Recherche réussie en ${searchResponse.duration}ms`);
      
      try {
        const searchData = JSON.parse(searchResponse.data);
        
        console.log('\n📊 RÉSULTATS:');
        console.log('==============');
        console.log(`🔍 Query: ${searchData.query}`);
        console.log(`📈 Total: ${searchData.totalResults} résultats`);
        
        // Vérifier les métriques de performance
        if (searchData.performance) {
          console.log('\n⚡ MÉTRIQUES DE PERFORMANCE:');
          console.log('==============================');
          console.log(`⏱️  Temps total: ${searchData.performance.totalTime}ms`);
          console.log(`🔢 Nombre de requêtes: ${searchData.performance.queryCount}`);
          console.log(`🚀 Optimisation: ${searchData.performance.optimization}`);
        }
        
        // Analyser les résultats
        if (searchData.artists && searchData.artists.length > 0) {
          console.log('\n👤 ARTISTES TROUVÉS:');
          console.log('======================');
          searchData.artists.forEach((artist, index) => {
            console.log(`   ${index + 1}. ${artist.username} (${artist.name})`);
          });
        }
        
        if (searchData.tracks && searchData.tracks.length > 0) {
          console.log('\n🎵 TRACKS TROUVÉES:');
          console.log('====================');
          searchData.tracks.forEach((track, index) => {
            console.log(`   ${index + 1}. ${track.title} par ${track.artist?.username || 'Inconnu'}`);
          });
        }
        
        // Évaluer les performances
        console.log('\n💡 ÉVALUATION DES PERFORMANCES:');
        console.log('==================================');
        
        if (searchResponse.duration < 300) {
          console.log('✅ EXCELLENT: Recherche très rapide (< 300ms)');
        } else if (searchResponse.duration < 600) {
          console.log('🟡 BON: Recherche rapide (< 600ms)');
        } else if (searchResponse.duration < 1000) {
          console.log('🟠 MOYEN: Recherche acceptable (< 1s)');
        } else {
          console.log('🔴 LENT: Recherche trop lente (> 1s)');
        }
        
        // Comparaison avec l'ancienne version
        console.log('\n📊 COMPARAISON AVEC L\'ANCIENNE VERSION:');
        console.log('==========================================');
        console.log('   Avant (séquentiel): ~689ms');
        console.log(`   Maintenant (parallèle): ${searchResponse.duration}ms`);
        
        const improvement = ((689 - searchResponse.duration) / 689 * 100).toFixed(1);
        if (searchResponse.duration < 689) {
          console.log(`   🚀 Amélioration: +${improvement}% plus rapide`);
        } else {
          console.log(`   ⚠️  Dégradation: ${Math.abs(improvement)}% plus lent`);
        }
        
      } catch (e) {
        console.log('❌ Erreur parsing JSON:', e.message);
      }
    } else {
      console.log(`❌ Erreur API: ${searchResponse.statusCode}`);
      console.log(`📄 Réponse: ${searchResponse.data.substring(0, 200)}...`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  
  console.log('\n🎉 TEST TERMINÉ !');
  console.log('==================');
}

// Exécuter le test
runPerformanceTest().catch(console.error);
