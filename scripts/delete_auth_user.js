// scripts/delete_auth_user.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAuthUser() {
  try {
    console.log('🔍 Recherche de l\'utilisateur test dans l\'authentification...');
    
    // Lister tous les utilisateurs
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', listError);
      return;
    }
    
    // Trouver l'utilisateur test
    const testUser = users.users.find(user => user.email === 'test@example.com');
    
    if (!testUser) {
      console.log('✅ Aucun utilisateur test trouvé dans l\'authentification');
      return;
    }
    
    console.log('✅ Utilisateur test trouvé dans l\'authentification:', {
      id: testUser.id,
      email: testUser.email,
      name: testUser.user_metadata?.name,
      username: testUser.user_metadata?.username,
      last_sign_in: testUser.last_sign_in_at
    });
    
    // Supprimer l'utilisateur de l'authentification
    console.log('🗑️ Suppression de l\'utilisateur de l\'authentification...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(testUser.id);
    
    if (deleteError) {
      console.error('❌ Erreur lors de la suppression:', deleteError);
    } else {
      console.log('✅ Utilisateur supprimé de l\'authentification avec succès !');
      console.log('📋 Résumé de la suppression:');
      console.log(`   - Email: ${testUser.email}`);
      console.log(`   - ID: ${testUser.id}`);
      console.log(`   - Nom: ${testUser.user_metadata?.name}`);
      console.log(`   - Username: ${testUser.user_metadata?.username}`);
    }
    
    // Vérifier que l'utilisateur a bien été supprimé
    console.log('\n🔍 Vérification de la suppression...');
    const { data: usersAfterDelete, error: checkError } = await supabase.auth.admin.listUsers();
    
    if (checkError) {
      console.error('❌ Erreur lors de la vérification:', checkError);
    } else {
      const userStillExists = usersAfterDelete.users.find(user => user.email === 'test@example.com');
      if (userStillExists) {
        console.log('⚠️ L\'utilisateur existe encore dans l\'authentification');
      } else {
        console.log('✅ L\'utilisateur a été complètement supprimé de l\'authentification');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
deleteAuthUser().then(() => {
  console.log('🏁 Script terminé');
  console.log('\n💡 Instructions:');
  console.log('   1. Redémarrez votre application (npm run dev)');
  console.log('   2. Videz le cache de votre navigateur (Ctrl+Shift+Delete)');
  console.log('   3. L\'utilisateur test ne devrait plus apparaître');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
