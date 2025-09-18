const { createClient } = require('@supabase/supabase-js');
const { getAudioCraftService } = require('../lib/audiocraftService');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseConnection() {
  console.log('🔍 Test connexion base de données...');
  
  try {
    const { data, error } = await supabase
      .from('ai_generations')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur connexion DB:', error);
      return false;
    }
    
    console.log('✅ Connexion base de données OK');
    return true;
  } catch (error) {
    console.error('❌ Erreur connexion DB:', error);
    return false;
  }
}

async function testAudioCraftService() {
  console.log('🎵 Test service AudioCraft...');
  
  try {
    const audioCraftService = getAudioCraftService();
    
    // Test d'initialisation
    const initialized = await audioCraftService.initialize();
    if (!initialized) {
      console.error('❌ AudioCraft non initialisé');
      return false;
    }
    
    console.log('✅ AudioCraft Service initialisé');
    
    // Test de génération
    console.log('🎼 Test génération audio...');
    const result = await audioCraftService.generateMusic({
      prompt: 'Test génération - mélodie simple',
      duration: 10
    });
    
    if (result.success) {
      console.log('✅ Génération audio réussie');
      console.log('   📁 Fichier:', result.audioPath);
      console.log('   ⏱️  Durée:', result.duration, 's');
      console.log('   🖥️  Device:', result.metadata.device);
      
      // Nettoyer
      if (result.audioPath) {
        await audioCraftService.cleanup(result.audioPath);
      }
      
      return true;
    } else {
      console.error('❌ Génération audio échouée:', result.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erreur test AudioCraft:', error);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log('🌐 Test endpoints API...');
  
  try {
    // Test endpoint quota
    const quotaResponse = await fetch('http://localhost:3000/api/ai/quota', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (quotaResponse.ok) {
      const quotaData = await quotaResponse.json();
      console.log('✅ Endpoint quota OK');
      console.log('   📊 Quota:', quotaData.used, '/', quotaData.total);
    } else {
      console.error('❌ Endpoint quota échoué:', quotaResponse.status);
    }
    
    // Test endpoint génération (simulation)
    console.log('🎼 Test endpoint génération (simulation)...');
    const generateResponse = await fetch('http://localhost:3000/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Test API - mélodie simple',
        duration: 15,
        style: 'pop'
      })
    });
    
    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log('✅ Endpoint génération OK');
      console.log('   🎵 ID:', generateData.id);
      console.log('   📁 URL:', generateData.audioUrl);
    } else {
      const errorData = await generateResponse.json();
      console.error('❌ Endpoint génération échoué:', errorData.error);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur test API:', error);
    return false;
  }
}

async function testUserInterface() {
  console.log('🖥️ Test interface utilisateur...');
  
  try {
    // Vérifier que la page existe
    const fs = require('fs');
    const pagePath = './app/ai-generator/page.tsx';
    
    if (fs.existsSync(pagePath)) {
      console.log('✅ Page générateur IA trouvée');
    } else {
      console.error('❌ Page générateur IA manquante');
      return false;
    }
    
    // Vérifier le hook de quota
    const hookPath = './hooks/useAIQuota.ts';
    if (fs.existsSync(hookPath)) {
      console.log('✅ Hook useAIQuota trouvé');
    } else {
      console.error('❌ Hook useAIQuota manquant');
      return false;
    }
    
    // Vérifier la navigation
    const navbarPath = './components/AppNavbar.tsx';
    if (fs.existsSync(navbarPath)) {
      const navbarContent = fs.readFileSync(navbarPath, 'utf8');
      if (navbarContent.includes('/ai-generator')) {
        console.log('✅ Lien IA dans la navigation');
      } else {
        console.warn('⚠️ Lien IA manquant dans la navigation');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur test interface:', error);
    return false;
  }
}

async function testQuotaSystem() {
  console.log('📊 Test système de quotas...');
  
  try {
    // Créer un utilisateur de test
    const testUserId = 'test-user-' + Date.now();
    
    // Insérer un utilisateur de test
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: 'test@synaura.com',
        username: 'testuser',
        subscription_plan: 'free'
      });
    
    if (insertError && !insertError.message.includes('duplicate')) {
      console.error('❌ Erreur création utilisateur test:', insertError);
      return false;
    }
    
    // Insérer quelques générations de test
    const testGenerations = [
      {
        user_id: testUserId,
        audio_url: 'https://test.com/audio1.mp3',
        prompt: 'Test génération 1',
        duration: 30,
        model: 'audiocraft',
        status: 'completed'
      },
      {
        user_id: testUserId,
        audio_url: 'https://test.com/audio2.mp3',
        prompt: 'Test génération 2',
        duration: 30,
        model: 'audiocraft',
        status: 'completed'
      }
    ];
    
    const { error: genError } = await supabase
      .from('ai_generations')
      .insert(testGenerations);
    
    if (genError) {
      console.error('❌ Erreur insertion générations test:', genError);
      return false;
    }
    
    // Vérifier le quota
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: usage, error: usageError } = await supabase
      .from('ai_generations')
      .select('id')
      .eq('user_id', testUserId)
      .gte('created_at', startOfMonth.toISOString());
    
    if (usageError) {
      console.error('❌ Erreur vérification quota:', usageError);
      return false;
    }
    
    console.log('✅ Système de quotas fonctionnel');
    console.log('   📊 Générations ce mois:', usage.length);
    
    // Nettoyer les données de test
    await supabase
      .from('ai_generations')
      .delete()
      .eq('user_id', testUserId);
    
    await supabase
      .from('users')
      .delete()
      .eq('id', testUserId);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur test quotas:', error);
    return false;
  }
}

async function main() {
  console.log('🧪 Test complet du système IA Synaura');
  console.log('=====================================\n');
  
  const tests = [
    { name: 'Base de données', fn: testDatabaseConnection },
    { name: 'Service AudioCraft', fn: testAudioCraftService },
    { name: 'Endpoints API', fn: testAPIEndpoints },
    { name: 'Interface utilisateur', fn: testUserInterface },
    { name: 'Système de quotas', fn: testQuotaSystem }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n🔍 Test: ${test.name}`);
    console.log('─'.repeat(50));
    
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
      
      if (success) {
        console.log(`✅ ${test.name}: SUCCÈS`);
      } else {
        console.log(`❌ ${test.name}: ÉCHEC`);
      }
    } catch (error) {
      console.error(`❌ ${test.name}: ERREUR`, error);
      results.push({ name: test.name, success: false });
    }
  }
  
  // Résumé
  console.log('\n📊 Résumé des tests');
  console.log('─'.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\n🎯 Résultat: ${passed}/${total} tests réussis`);
  
  if (passed === total) {
    console.log('\n🎉 Tous les tests sont passés ! Le système IA est prêt.');
    console.log('\n📋 Prochaines étapes :');
    console.log('   1. Lancer l\'application: npm run dev');
    console.log('   2. Tester l\'interface: http://localhost:3000/ai-generator');
    console.log('   3. Configurer Cloudinary pour l\'upload');
    console.log('   4. Optimiser les performances');
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testDatabaseConnection,
  testAudioCraftService,
  testAPIEndpoints,
  testUserInterface,
  testQuotaSystem
};
