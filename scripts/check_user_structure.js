// scripts/check_user_structure.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserStructure() {
  try {
    console.log('🔍 Vérification de la structure de la table users...');
    
    // Récupérer tous les utilisateurs pour voir la structure
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Erreur lors de la récupération:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ Aucun utilisateur trouvé');
      return;
    }
    
    console.log('✅ Structure de la table users:');
    console.log('Colonnes disponibles:', Object.keys(users[0]));
    console.log('\nExemple d\'utilisateur:');
    console.log(JSON.stringify(users[0], null, 2));
    
    // Chercher l'utilisateur test par email ou nom
    console.log('\n🔍 Recherche de l\'utilisateur test...');
    
    // Essayer par email
    const { data: testUserByEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', '%test%');
    
    if (!emailError && testUserByEmail && testUserByEmail.length > 0) {
      console.log('✅ Utilisateur test trouvé par email:');
      console.log(JSON.stringify(testUserByEmail[0], null, 2));
    }
    
    // Essayer par nom
    const { data: testUserByName, error: nameError } = await supabase
      .from('users')
      .select('*')
      .ilike('name', '%test%');
    
    if (!nameError && testUserByName && testUserByName.length > 0) {
      console.log('✅ Utilisateur test trouvé par nom:');
      console.log(JSON.stringify(testUserByName[0], null, 2));
    }
    
    // Lister tous les utilisateurs
    console.log('\n📋 Liste de tous les utilisateurs:');
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, name, email, created_at');
    
    if (!allError && allUsers) {
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id} | Nom: ${user.name} | Email: ${user.email}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
checkUserStructure().then(() => {
  console.log('🏁 Script terminé');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
