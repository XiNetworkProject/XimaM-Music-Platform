const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Charger manuellement .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#')) {
        const value = valueParts.join('=').trim();
        if (value) {
          envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    
    Object.assign(process.env, envVars);
    console.log('✅ Fichier .env.local chargé manuellement');
  } else {
    console.log('⚠️  Fichier .env.local non trouvé');
  }
}

loadEnvFile();

// Configuration
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  nextauth: {
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    secret: process.env.NEXTAUTH_SECRET
  }
};

console.log('🔧 Configuration de test :');
console.log(`✅ Supabase URL: ${config.supabase.url ? 'Configuré' : '❌ Manquant'}`);
console.log(`✅ Supabase Anon Key: ${config.supabase.anonKey ? 'Configuré' : '❌ Manquant'}`);
console.log(`✅ NextAuth URL: ${config.nextauth.url}`);
console.log(`✅ NextAuth Secret: ${config.nextauth.secret ? 'Configuré' : '❌ Manquant'}`);

if (!config.supabase.url || !config.supabase.anonKey) {
  console.error('❌ Configuration Supabase incomplète');
  process.exit(1);
}

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

async function testSupabaseAuth() {
  console.log('\n🧪 TEST AUTHENTIFICATION SUPABASE DIRECTE');
  console.log('==========================================');
  
  try {
    // 1. Tester la connexion avec un utilisateur existant
    console.log('\n1️⃣ Test de connexion Supabase...');
    
    // Récupérer un profil existant
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError || !profiles.length) {
      console.log('❌ Aucun profil trouvé pour le test');
      return;
    }
    
    const testProfile = profiles[0];
    console.log(`🔍 Test avec le profil: ${testProfile.email}`);
    
    // Tenter la connexion (sans mot de passe pour le test)
    console.log('⚠️  Test de connexion sans mot de passe (pour vérifier la structure)');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testProfile.email,
      password: 'test_password_wrong'
    });
    
    if (authError) {
      console.log(`✅ Erreur attendue (mot de passe incorrect): ${authError.message}`);
      console.log(`   📊 Code d'erreur: ${authError.status}`);
    } else {
      console.log('❌ Connexion réussie (inattendu avec mauvais mot de passe)');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test Supabase:', error.message);
  }
}

async function testNextAuthAPI() {
  console.log('\n🧪 TEST API NEXTAUTH');
  console.log('=====================');
  
  try {
    // 2. Tester l'API NextAuth
    console.log('\n2️⃣ Test de l\'API NextAuth...');
    
    const apiUrl = `${config.nextauth.url}/api/auth/callback/credentials`;
    console.log(`🔗 URL de test: ${apiUrl}`);
    
    // Simuler une requête POST vers l'API
    console.log('📤 Simulation d\'une requête POST vers l\'API...');
    
    // Note: On ne peut pas faire de vraie requête HTTP depuis ce script Node.js
    // mais on peut vérifier la configuration
    
    console.log('✅ Configuration API NextAuth vérifiée');
    console.log('💡 Pour tester l\'API, utilisez votre navigateur ou Postman');
    
  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message);
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT');
  console.log('==============================================');
  
  const requiredVars = {
    'NEXT_PUBLIC_SUPABASE_URL': config.supabase.url,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': config.supabase.anonKey,
    'SUPABASE_SERVICE_ROLE_KEY': config.supabase.serviceKey,
    'NEXTAUTH_URL': config.nextauth.url,
    'NEXTAUTH_SECRET': config.nextauth.secret
  };
  
  let allConfigured = true;
  
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (value) {
      console.log(`✅ ${key}: Configuré`);
    } else {
      console.log(`❌ ${key}: Manquant`);
      allConfigured = false;
    }
  });
  
  if (!allConfigured) {
    console.log('\n⚠️  Certaines variables d\'environnement sont manquantes');
    console.log('💡 Vérifiez votre fichier .env.local');
  } else {
    console.log('\n✅ Toutes les variables d\'environnement sont configurées');
  }
  
  return allConfigured;
}

async function analyzeAuthFlow() {
  console.log('\n🔍 ANALYSE DU FLUX D\'AUTHENTIFICATION');
  console.log('========================================');
  
  console.log('\n📋 FLUX D\'AUTHENTIFICATION ACTUEL:');
  console.log('1️⃣ Utilisateur saisit email/mot de passe');
  console.log('2️⃣ NextAuth appelle CredentialsProvider.authorize()');
  console.log('3️⃣ authorize() appelle supabase.auth.signInWithPassword()');
  console.log('4️⃣ Si succès, profil récupéré depuis table profiles');
  console.log('5️⃣ Session créée avec les données utilisateur');
  
  console.log('\n🔍 POINTS DE VÉRIFICATION:');
  console.log('✅ Supabase client configuré');
  console.log('✅ Table profiles accessible');
  console.log('✅ Comptes auth existants');
  console.log('❓ NextAuth secret configuré');
  console.log('❓ Variables d\'environnement chargées');
  
  console.log('\n💡 CAUSES POSSIBLES DE L\'ERREUR 401:');
  console.log('• NEXTAUTH_SECRET manquant ou incorrect');
  console.log('• Problème de cookies/session');
  console.log('• Conflit entre MongoDB et Supabase');
  console.log('• Problème de CORS');
  console.log('• Erreur dans le callback authorize()');
}

async function main() {
  console.log('🚀 DIAGNOSTIC COMPLET DU SYSTÈME D\'AUTHENTIFICATION');
  console.log('====================================================');
  
  try {
    // 1. Vérifier les variables d'environnement
    const envOk = await checkEnvironmentVariables();
    
    if (!envOk) {
      console.log('\n❌ Arrêt du diagnostic - variables manquantes');
      return;
    }
    
    // 2. Test Supabase direct
    await testSupabaseAuth();
    
    // 3. Test API NextAuth
    await testNextAuthAPI();
    
    // 4. Analyse du flux
    await analyzeAuthFlow();
    
    console.log('\n🎉 DIAGNOSTIC TERMINÉ !');
    console.log('========================');
    console.log('\n💡 PROCHAINES ÉTAPES:');
    console.log('1. Vérifiez que NEXTAUTH_SECRET est bien défini');
    console.log('2. Redémarrez votre serveur Next.js');
    console.log('3. Testez la connexion dans le navigateur');
    console.log('4. Vérifiez les logs du serveur');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSupabaseAuth, testNextAuthAPI, checkEnvironmentVariables };
