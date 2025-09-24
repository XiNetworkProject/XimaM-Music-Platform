// Script Node.js pour changer le mot de passe via l'API Supabase Admin
// Exécuter avec: node scripts/change_password_admin.js

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase Admin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Vérification des variables d\'environnement...');
console.log('Supabase URL:', supabaseUrl ? '✅ Présent' : '❌ Manquant');
console.log('Service Key:', supabaseServiceKey ? '✅ Présent' : '❌ Manquant');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('Vérifiez que .env.local contient:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listAllUsers() {
  try {
    console.log('📋 Liste de tous les utilisateurs:');
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Erreur récupération utilisateurs:', error.message);
      return;
    }

    console.log(`📊 ${data.users.length} utilisateur(s) trouvé(s):`);
    data.users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Créé: ${user.created_at}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

async function changePassword() {
  try {
    const email = 'evannlagersie30@gmail.com'; // Correction: evannlagersie30 au lieu de evannlargersie30
    const newPassword = 'GoLLoum36012';

    console.log(`🔄 Changement du mot de passe pour: ${email}`);

    // D'abord lister tous les utilisateurs pour debug
    await listAllUsers();

    // Utiliser l'API Admin pour mettre à jour le mot de passe
    const { data, error } = await supabase.auth.admin.updateUserById(
      // On doit d'abord récupérer l'ID de l'utilisateur
      await getUserIdByEmail(email),
      { password: newPassword }
    );

    if (error) {
      console.error('❌ Erreur:', error.message);
      return;
    }

    console.log('✅ Mot de passe mis à jour avec succès!');
    console.log('📧 Email:', data.user.email);
    console.log('🆔 ID:', data.user.id);

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

async function getUserIdByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    throw new Error(`Erreur récupération utilisateurs: ${error.message}`);
  }

  const user = data.users.find(u => u.email === email);
  if (!user) {
    throw new Error(`Utilisateur non trouvé: ${email}`);
  }

  return user.id;
}

// Exécuter le script
changePassword();
