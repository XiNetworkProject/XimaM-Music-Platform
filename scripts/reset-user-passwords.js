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
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};

console.log('🔧 Configuration de réinitialisation des mots de passe :');
console.log(`✅ Supabase URL: ${config.supabase.url ? 'Configuré' : '❌ Manquant'}`);
console.log(`✅ Supabase Service Key: ${config.supabase.serviceKey ? 'Configuré' : '❌ Manquant'}`);

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.error('❌ Configuration incomplète. Vérifiez vos variables d\'environnement.');
  process.exit(1);
}

// Initialiser Supabase avec la clé service (admin)
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function resetUserPasswords() {
  console.log('\n🔄 RÉINITIALISATION DES MOTS DE PASSE');
  console.log('========================================');
  
  try {
    // 1. Récupérer tous les utilisateurs
    console.log('\n1️⃣ Récupération des utilisateurs...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erreur récupération utilisateurs:', authError.message);
      return;
    }
    
    console.log(`📊 ${authUsers.users.length} utilisateurs trouvés`);
    
    // 2. Réinitialiser les mots de passe
    console.log('\n2️⃣ Réinitialisation des mots de passe...');
    
    const results = [];
    
    for (const user of authUsers.users) {
      try {
        console.log(`\n🔧 Réinitialisation pour: ${user.email}`);
        
        // Générer un nouveau mot de passe temporaire
        const tempPassword = generateTempPassword();
        
        // Mettre à jour le mot de passe
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { password: tempPassword }
        );
        
        if (updateError) {
          console.log(`   ❌ Erreur mise à jour: ${updateError.message}`);
          results.push({ email: user.email, status: 'error', error: updateError.message });
        } else {
          console.log(`   ✅ Mot de passe réinitialisé: ${tempPassword}`);
          results.push({ email: user.email, status: 'success', tempPassword });
        }
        
      } catch (error) {
        console.log(`   ❌ Erreur pour ${user.email}: ${error.message}`);
        results.push({ email: user.email, status: 'error', error: error.message });
      }
    }
    
    // 3. Résumé des résultats
    console.log('\n📊 RÉSUMÉ DES RÉINITIALISATIONS');
    console.log('==================================');
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    
    if (successCount > 0) {
      console.log('\n🔑 NOUVEAUX MOTS DE PASSE TEMPORAIRES:');
      console.log('========================================');
      
      results.filter(r => r.status === 'success').forEach(result => {
        console.log(`👤 ${result.email}: ${result.tempPassword}`);
      });
      
      console.log('\n💡 INSTRUCTIONS POUR LES UTILISATEURS:');
      console.log('========================================');
      console.log('1. Connectez-vous avec le mot de passe temporaire');
      console.log('2. Changez immédiatement votre mot de passe');
      console.log('3. Utilisez un mot de passe sécurisé');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error.message);
    return null;
  }
}

function generateTempPassword() {
  // Générer un mot de passe temporaire sécurisé
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}

async function testAuthentication(email, password) {
  console.log('\n🧪 TEST D\'AUTHENTIFICATION');
  console.log('=============================');
  
  try {
    console.log(`🔍 Test avec: ${email}`);
    
    // Tester la connexion
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (authError) {
      console.log(`❌ Échec de connexion: ${authError.message}`);
      return false;
    } else {
      console.log(`✅ Connexion réussie pour: ${authData.user.email}`);
      return true;
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 RÉSOLUTION DU PROBLÈME D\'AUTHENTIFICATION');
  console.log('==============================================');
  
  try {
    // 1. Réinitialiser les mots de passe
    const results = await resetUserPasswords();
    
    if (results && results.length > 0) {
      // 2. Tester l'authentification avec le premier utilisateur
      const firstSuccess = results.find(r => r.status === 'success');
      
      if (firstSuccess) {
        console.log('\n🧪 TEST DE CONNEXION APRÈS RÉINITIALISATION');
        console.log('==============================================');
        
        await testAuthentication(firstSuccess.email, firstSuccess.tempPassword);
      }
    }
    
    console.log('\n🎉 RÉINITIALISATION TERMINÉE !');
    console.log('================================');
    console.log('\n💡 PROCHAINES ÉTAPES:');
    console.log('1. Testez la connexion avec les nouveaux mots de passe');
    console.log('2. Demandez aux utilisateurs de changer leurs mots de passe');
    console.log('3. L\'erreur 401 devrait être résolue');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { resetUserPasswords, testAuthentication };
