const http = require('http');

console.log('⚡ TEST DE PERFORMANCE DES PROFILS');
console.log('====================================');

// Test de performance de l'API de profil
const testProfilePerformance = (username) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/users/${username}`,
      method: 'GET',
      headers: {
        'User-Agent': 'XimaM-Performance-Test/1.0'
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
        'User-Agent': 'XimaM-Performance-Test/1.0'
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
  console.log('\n⚡ TEST DE PERFORMANCE COMPLET');
  console.log('================================');
  
  try {
    // Test 1: Performance de la recherche
    console.log('\n🔍 TEST 1: PERFORMANCE DE LA RECHERCHE');
    console.log('========================================');
    
    const searchStart = Date.now();
    const searchResponse = await testSearchPerformance('ximamoff');
    const searchTotal = Date.now() - searchStart;
    
    if (searchResponse.statusCode === 200) {
      console.log(`✅ Recherche réussie en ${searchResponse.duration}ms`);
      console.log(`⏱️  Temps total (avec overhead): ${searchTotal}ms`);
      
      try {
        const searchData = JSON.parse(searchResponse.data);
        console.log(`📊 Résultats: ${searchData.totalResults} trouvés`);
        
        if (searchData.artists && searchData.artists.length > 0) {
          console.log(`👤 Premier artiste: ${searchData.artists[0].username}`);
        }
      } catch (e) {
        console.log('❌ Erreur parsing recherche');
      }
    } else {
      console.log(`❌ Erreur recherche: ${searchResponse.statusCode}`);
    }
    
    // Test 2: Performance du profil (temps de chargement)
    console.log('\n👤 TEST 2: PERFORMANCE DU PROFIL');
    console.log('==================================');
    
    const profileStart = Date.now();
    const profileResponse = await testProfilePerformance('ximamoff');
    const profileTotal = Date.now() - profileStart;
    
    if (profileResponse.statusCode === 200) {
      console.log(`✅ Profil chargé en ${profileResponse.duration}ms`);
      console.log(`⏱️  Temps total (avec overhead): ${profileTotal}ms`);
      
      // Analyser la taille des données
      const dataSize = Buffer.byteLength(profileResponse.data, 'utf8');
      console.log(`📦 Taille des données: ${(dataSize / 1024).toFixed(2)} KB`);
      
      try {
        const profileData = JSON.parse(profileResponse.data);
        
        // Analyser la structure des données
        console.log('\n🔍 ANALYSE DES DONNÉES:');
        console.log('========================');
        console.log(`👤 Username: ${profileData.username}`);
        console.log(`🎵 Tracks: ${profileData.tracks?.length || 0}`);
        console.log(`📚 Playlists: ${profileData.playlists?.length || 0}`);
        console.log(`❤️  Total likes: ${profileData.totalLikes || 0}`);
        console.log(`▶️  Total plays: ${profileData.totalPlays || 0}`);
        
        // Vérifier les performances par type de données
        if (profileData.tracks && profileData.tracks.length > 0) {
          const trackWithCover = profileData.tracks.filter(t => t.cover_url);
          const trackWithAudio = profileData.tracks.filter(t => t.audio_url);
          console.log(`🖼️  Tracks avec cover: ${trackWithCover.length}/${profileData.tracks.length}`);
          console.log(`🎵 Tracks avec audio: ${trackWithAudio.length}/${profileData.tracks.length}`);
        }
        
      } catch (e) {
        console.log('❌ Erreur parsing profil:', e.message);
      }
    } else {
      console.log(`❌ Erreur profil: ${profileResponse.statusCode}`);
      console.log(`📄 Réponse: ${profileResponse.data.substring(0, 200)}...`);
    }
    
    // Test 3: Performance avec cache (simulation)
    console.log('\n🔄 TEST 3: PERFORMANCE AVEC CACHE');
    console.log('===================================');
    
    // Test de la même requête plusieurs fois (simulation cache)
    console.log('🔄 Test de la même requête (simulation cache)...');
    
    const cacheTests = [];
    for (let i = 0; i < 3; i++) {
      const cacheStart = Date.now();
      const cacheResponse = await testProfilePerformance('ximamoff');
      const cacheDuration = Date.now() - cacheStart;
      
      cacheTests.push({
        iteration: i + 1,
        duration: cacheResponse.duration,
        total: cacheDuration
      });
      
      console.log(`   Itération ${i + 1}: ${cacheResponse.duration}ms (total: ${cacheDuration}ms)`);
    }
    
    // Analyser les performances
    const avgDuration = cacheTests.reduce((sum, test) => sum + test.duration, 0) / cacheTests.length;
    const avgTotal = cacheTests.reduce((sum, test) => sum + test.total, 0) / cacheTests.length;
    
    console.log(`\n📊 MOYENNES:`);
    console.log(`   API: ${avgDuration.toFixed(0)}ms`);
    console.log(`   Total: ${avgTotal.toFixed(0)}ms`);
    
    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('====================');
    
    if (avgDuration > 1000) {
      console.log('🚨 PERFORMANCE CRITIQUE:');
      console.log('   - Optimiser les requêtes Supabase');
      console.log('   - Ajouter des index sur les colonnes clés');
      console.log('   - Implémenter un système de cache');
      console.log('   - Réduire la taille des données retournées');
    } else if (avgDuration > 500) {
      console.log('⚠️  PERFORMANCE MOYENNE:');
      console.log('   - Vérifier les requêtes N+1');
      console.log('   - Optimiser les jointures');
      console.log('   - Ajouter du lazy loading');
    } else {
      console.log('✅ PERFORMANCE ACCEPTABLE');
      console.log('   - Continuer le monitoring');
      console.log('   - Optimiser si nécessaire');
    }
    
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
  }
  
  console.log('\n🎉 TEST DE PERFORMANCE TERMINÉ !');
  console.log('==================================');
}

// Exécuter le test
runPerformanceTest().catch(console.error);
