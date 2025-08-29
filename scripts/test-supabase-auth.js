const { createClient } = require('@supabase/supabase-js');
const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function testSupabaseAuth() {
  console.log('🧪 TEST AUTHENTIFICATION SUPABASE');
  console.log('==================================');
  
  try {
    // 1. Lister tous les utilisateurs dans Supabase Auth
    console.log('\n1️⃣ Récupération des utilisateurs Supabase Auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erreur récupération utilisateurs Auth:', authError);
      return;
    }
    
    console.log(`✅ ${authUsers.users.length} utilisateurs trouvés dans Supabase Auth`);
    
    // 2. Lister tous les profils dans la table profiles
    console.log('\n2️⃣ Récupération des profils utilisateurs...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Erreur récupération profils:', profilesError);
      return;
    }
    
    console.log(`✅ ${profiles.length} profils trouvés dans la table profiles`);
    
    // 3. Vérifier la correspondance Auth ↔ Profiles
    console.log('\n3️⃣ Vérification de la correspondance Auth ↔ Profiles...');
    const authUserIds = authUsers.users.map(u => u.id);
    const profileIds = profiles.map(p => p.id);
    
    const missingProfiles = authUserIds.filter(id => !profileIds.includes(id));
    const orphanProfiles = profileIds.filter(id => !authUserIds.includes(id));
    
    if (missingProfiles.length > 0) {
      console.log(`⚠️ ${missingProfiles.length} utilisateurs Auth sans profil:`, missingProfiles);
    }
    
    if (orphanProfiles.length > 0) {
      console.log(`⚠️ ${orphanProfiles.length} profils orphelins:`, orphanProfiles);
    }
    
    if (missingProfiles.length === 0 && orphanProfiles.length === 0) {
      console.log('✅ Tous les utilisateurs Auth ont un profil correspondant');
    }
    
    // 4. Tester l'authentification avec un utilisateur existant
    console.log('\n4️⃣ Test d\'authentification...');
    if (authUsers.users.length > 0) {
      const testUser = authUsers.users[0];
      console.log(`🧪 Test avec l'utilisateur: ${testUser.email}`);
      
      // Note: On ne peut pas tester le mot de passe sans le connaître
      console.log('ℹ️ Test d\'authentification nécessite le mot de passe de l\'utilisateur');
      console.log('ℹ️ Utilisez l\'interface web pour tester la connexion');
    }
    
    // 5. Afficher les détails des utilisateurs
    console.log('\n5️⃣ Détails des utilisateurs migrés:');
    authUsers.users.forEach((user, index) => {
      const profile = profiles.find(p => p.id === user.id);
      console.log(`\n👤 Utilisateur ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Créé: ${user.created_at}`);
      console.log(`   Profil: ${profile ? '✅ Créé' : '❌ Manquant'}`);
      if (profile) {
        console.log(`   Nom: ${profile.name || 'Non défini'}`);
        console.log(`   Username: ${profile.username || 'Non défini'}`);
        console.log(`   Vérifié: ${profile.is_verified ? '✅ Oui' : '❌ Non'}`);
        console.log(`   Artiste: ${profile.is_artist ? '✅ Oui' : '❌ Non'}`);
      }
    });
    
    console.log('\n🎉 TEST AUTHENTIFICATION SUPABASE TERMINÉ !');
    console.log('===========================================');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Tester la connexion dans l\'interface web');
    console.log('2. Vérifier que les sessions sont bien créées');
    console.log('3. Tester l\'accès aux données utilisateur');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Lancer le test
if (require.main === module) {
  testSupabaseAuth();
}
