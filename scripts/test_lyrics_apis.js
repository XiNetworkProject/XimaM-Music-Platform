// Script de test pour vérifier que les APIs incluent les paroles
const testAPIs = async () => {
  const apis = [
    '/api/tracks/popular?limit=1',
    '/api/tracks/trending?limit=1',
    '/api/tracks/recent?limit=1',
    '/api/tracks/most-liked?limit=1',
    '/api/tracks/recommended?limit=1'
  ];

  console.log('🧪 Test des APIs pour vérifier les paroles...\n');

  for (const api of apis) {
    try {
      const response = await fetch(`http://localhost:3000${api}`);
      if (response.ok) {
        const data = await response.json();
        const track = data.tracks?.[0];
        
        console.log(`✅ ${api}`);
        console.log(`   Titre: ${track?.title || 'N/A'}`);
        console.log(`   Paroles: ${track?.lyrics ? '✅ Présentes' : '❌ Manquantes'}`);
        if (track?.lyrics) {
          console.log(`   Longueur: ${track.lyrics.length} caractères`);
        }
        console.log('');
      } else {
        console.log(`❌ ${api} - Erreur ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${api} - Erreur: ${error.message}`);
    }
  }
};

// Exécuter le test
testAPIs().then(() => {
  console.log('🎵 Test terminé');
}).catch(console.error);
