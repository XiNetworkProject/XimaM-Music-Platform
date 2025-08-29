const { createClient } = require('@supabase/supabase-js');
const { MongoClient } = require('mongodb');
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
    
    // Appliquer les variables à process.env
    Object.assign(process.env, envVars);
    console.log('✅ Fichier .env.local chargé manuellement');
  } else {
    console.log('⚠️  Fichier .env.local non trouvé');
  }
}

// Charger les variables d'environnement
loadEnvFile();

// Configuration
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  },
  mongodb: {
    uri: process.env.MONGODB_URI
  }
};

// Debug des variables
console.log('\n🔧 Configuration de migration :');
console.log(`✅ Supabase URL: ${config.supabase.url ? 'Configuré' : '❌ Manquant'}`);
console.log(`✅ Supabase Service Key: ${config.supabase.serviceKey ? 'Configuré' : '❌ Manquant'}`);
console.log(`✅ MongoDB URI: ${config.mongodb.uri ? 'Configuré' : '❌ Manquant'}`);

// Debug des valeurs (masquées pour la sécurité)
if (config.supabase.url) {
  console.log(`   📍 URL: ${config.supabase.url.substring(0, 20)}...`);
}
if (config.supabase.serviceKey) {
  console.log(`   🔑 Service Key: ${config.supabase.serviceKey.substring(0, 20)}...`);
}
if (config.mongodb.uri) {
  console.log(`   🗄️  MongoDB: ${config.mongodb.uri.substring(0, 30)}...`);
}

if (!config.supabase.url || !config.supabase.serviceKey || !config.mongodb.uri) {
  console.error('\n❌ Configuration incomplète. Vérifiez vos variables d\'environnement.');
  console.log('\n💡 Variables requises dans .env.local:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('   MONGODB_URI=mongodb://localhost:27017/ximam');
  process.exit(1);
}

// Initialiser Supabase avec la clé service (admin)
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function diagnoseAuthIssue() {
  console.log('\n🔍 DIAGNOSTIC AUTHENTIFICATION SUPABASE');
  console.log('=========================================');
  
  try {
    // 1. Vérifier les utilisateurs dans auth.users
    console.log('\n1️⃣ Vérification des comptes auth Supabase...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erreur récupération auth.users:', authError.message);
      return;
    }
    
    console.log(`📊 Comptes auth Supabase: ${authUsers.users.length}`);
    authUsers.users.forEach(user => {
      console.log(`   👤 ${user.email} (${user.id}) - Créé: ${user.created_at}`);
    });
    
    // 2. Vérifier les profils dans la table profiles
    console.log('\n2️⃣ Vérification des profils Supabase...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Erreur récupération profiles:', profilesError.message);
      return;
    }
    
    console.log(`📊 Profils Supabase: ${profiles.length}`);
    profiles.forEach(profile => {
      console.log(`   👤 ${profile.email} (${profile.id}) - Nom: ${profile.name}`);
    });
    
    // 3. Identifier les utilisateurs sans compte auth
    console.log('\n3️⃣ Identification des utilisateurs sans compte auth...');
    const profilesWithoutAuth = profiles.filter(profile => 
      !authUsers.users.some(authUser => authUser.email === profile.email)
    );
    
    if (profilesWithoutAuth.length === 0) {
      console.log('✅ Tous les profils ont un compte auth correspondant !');
      return;
    }
    
    console.log(`⚠️  ${profilesWithoutAuth.length} profils sans compte auth:`);
    profilesWithoutAuth.forEach(profile => {
      console.log(`   ❌ ${profile.email} - ${profile.name}`);
    });
    
    return profilesWithoutAuth;
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    return null;
  }
}

async function createMissingAuthAccounts(profilesWithoutAuth) {
  console.log('\n🛠️  CRÉATION DES COMPTES AUTH MANQUANTS');
  console.log('==========================================');
  
  if (!profilesWithoutAuth || profilesWithoutAuth.length === 0) {
    console.log('✅ Aucun compte auth à créer.');
    return;
  }
  
  // Récupérer les mots de passe depuis MongoDB
  console.log('\n4️⃣ Récupération des mots de passe depuis MongoDB...');
  const mongoClient = await MongoClient.connect(config.mongodb.uri);
  const db = mongoClient.db();
  
  const results = [];
  
  for (const profile of profilesWithoutAuth) {
    try {
      console.log(`\n🔧 Création du compte auth pour: ${profile.email}`);
      
      // Récupérer le mot de passe depuis MongoDB
      const mongoUser = await db.collection('users').findOne({ email: profile.email });
      
      if (!mongoUser || !mongoUser.password) {
        console.log(`   ⚠️  Pas de mot de passe trouvé pour ${profile.email}`);
        results.push({ email: profile.email, status: 'no_password', error: 'Mot de passe non trouvé' });
        continue;
      }
      
      // Créer le compte auth dans Supabase
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: profile.email,
        password: mongoUser.password, // Utiliser le mot de passe MongoDB
        email_confirm: true, // Confirmer automatiquement l'email
        user_metadata: {
          name: profile.name,
          username: profile.username
        }
      });
      
      if (createError) {
        console.log(`   ❌ Erreur création compte auth: ${createError.message}`);
        results.push({ email: profile.email, status: 'error', error: createError.message });
      } else {
        console.log(`   ✅ Compte auth créé: ${newUser.user.id}`);
        results.push({ email: profile.email, status: 'success', userId: newUser.user.id });
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur pour ${profile.email}: ${error.message}`);
      results.push({ email: profile.email, status: 'error', error: error.message });
    }
  }
  
  await mongoClient.close();
  
  // Résumé des résultats
  console.log('\n📊 RÉSUMÉ DES CRÉATIONS');
  console.log('========================');
  
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const noPasswordCount = results.filter(r => r.status === 'no_password').length;
  
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`⚠️  Pas de mot de passe: ${noPasswordCount}`);
  
  if (noPasswordCount > 0) {
    console.log('\n💡 Pour les utilisateurs sans mot de passe, vous devrez:');
    console.log('   1. Créer manuellement leurs comptes auth dans Supabase');
    console.log('   2. Ou leur demander de réinitialiser leur mot de passe');
  }
  
  return results;
}

async function testAuthentication() {
  console.log('\n🧪 TEST D\'AUTHENTIFICATION');
  console.log('=============================');
  
  try {
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
    
    // Vérifier si le compte auth existe
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Erreur lors de la vérification auth');
      return;
    }
    
    const authUser = authUsers.users.find(u => u.email === testProfile.email);
    
    if (authUser) {
      console.log(`✅ Compte auth trouvé: ${authUser.id}`);
      console.log(`   📧 Email confirmé: ${authUser.email_confirmed_at ? 'Oui' : 'Non'}`);
      console.log(`   🔐 Compte actif: ${authUser.banned_until ? 'Non' : 'Oui'}`);
    } else {
      console.log(`❌ Compte auth manquant pour ${testProfile.email}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

async function main() {
  console.log('🚀 RÉSOLUTION DU PROBLÈME D\'AUTHENTIFICATION SUPABASE');
  console.log('========================================================');
  
  try {
    // 1. Diagnostic
    const profilesWithoutAuth = await diagnoseAuthIssue();
    
    // 2. Création des comptes manquants
    if (profilesWithoutAuth && profilesWithoutAuth.length > 0) {
      await createMissingAuthAccounts(profilesWithoutAuth);
    }
    
    // 3. Test d'authentification
    await testAuthentication();
    
    console.log('\n🎉 DIAGNOSTIC TERMINÉ !');
    console.log('========================');
    console.log('💡 Prochaines étapes:');
    console.log('   1. Testez la connexion avec un utilisateur existant');
    console.log('   2. Si des erreurs persistent, vérifiez les logs Supabase');
    console.log('   3. Redémarrez votre application Next.js');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { diagnoseAuthIssue, createMissingAuthAccounts, testAuthentication };
