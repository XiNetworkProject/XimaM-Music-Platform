// fetch est natif dans Node.js 18+

async function testQuotaEndpoint() {
  console.log('🧪 Test de l\'endpoint quota...');
  
  try {
    const response = await fetch('http://localhost:3000/api/ai/quota', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Réponse réussie:');
      console.log('   📊 Utilisé:', data.used);
      console.log('   📊 Total:', data.total);
      console.log('   📊 Restant:', data.remaining);
      console.log('   📊 Plan:', data.plan);
      console.log('   📊 Pourcentage:', data.percentage);
    } else {
      const error = await response.text();
      console.error('❌ Erreur:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    console.log('\n💡 Solutions possibles :');
    console.log('   1. Vérifier que l\'application est lancée (npm run dev)');
    console.log('   2. Vérifier les variables d\'environnement');
    console.log('   3. Vérifier la connexion Supabase');
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  testQuotaEndpoint();
}

module.exports = { testQuotaEndpoint };
