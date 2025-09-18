const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserSync() {
  console.log('🔍 Vérification de la synchronisation des utilisateurs...\n');

  try {
    // 1. Vérifier les utilisateurs dans auth.users (Supabase Auth)
    console.log('📊 Utilisateurs dans auth.users (Supabase Auth):');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erreur auth.users:', authError);
      return;
    }

    console.log(`   ✅ ${authUsers.users.length} utilisateurs trouvés`);
    authUsers.users.forEach(user => {
      console.log(`   - ${user.email} (${user.id})`);
    });

    // 2. Vérifier les utilisateurs dans la table users
    console.log('\n📊 Utilisateurs dans la table users:');
    const { data: tableUsers, error: tableError } = await supabase
      .from('users')
      .select('id, email, subscription_plan, created_at');

    if (tableError) {
      console.error('❌ Erreur table users:', tableError);
      return;
    }

    console.log(`   ✅ ${tableUsers.length} utilisateurs trouvés`);
    tableUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.id}) - Plan: ${user.subscription_plan || 'free'}`);
    });

    // 3. Comparer les deux listes
    console.log('\n🔍 Analyse des différences:');
    const authUserIds = new Set(authUsers.users.map(u => u.id));
    const tableUserIds = new Set(tableUsers.map(u => u.id));

    const missingInTable = authUsers.users.filter(u => !tableUserIds.has(u.id));
    const missingInAuth = tableUsers.filter(u => !authUserIds.has(u.id));

    if (missingInTable.length > 0) {
      console.log('❌ Utilisateurs dans auth.users mais PAS dans la table users:');
      missingInTable.forEach(user => {
        console.log(`   - ${user.email} (${user.id})`);
      });
    } else {
      console.log('✅ Tous les utilisateurs auth.users sont dans la table users');
    }

    if (missingInAuth.length > 0) {
      console.log('⚠️ Utilisateurs dans la table users mais PAS dans auth.users:');
      missingInAuth.forEach(user => {
        console.log(`   - ${user.email} (${user.id})`);
      });
    } else {
      console.log('✅ Tous les utilisateurs de la table users sont dans auth.users');
    }

    // 4. Proposer des solutions
    if (missingInTable.length > 0) {
      console.log('\n🛠️ Solutions:');
      console.log('   1. Exécuter la synchronisation automatique');
      console.log('   2. Créer manuellement les utilisateurs manquants');
      console.log('   3. Vérifier les triggers de synchronisation');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  checkUserSync();
}

module.exports = { checkUserSync };
