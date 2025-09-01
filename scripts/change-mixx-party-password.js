const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function changeMixxPartyPassword() {
  try {
    console.log('🔐 Changement du mot de passe de Mixx Party...');
    console.log('📧 Email: associations@kreadev.org');
    console.log('🔑 Nouveau mot de passe: Valentin@100');
    
    // Vérifier si nous avons la clé service_role
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n❌ Clé SUPABASE_SERVICE_ROLE_KEY non trouvée dans .env.local');
      console.log('⚠️  Pour changer le mot de passe, vous devez:');
      console.log('   1. Aller dans le dashboard Supabase');
      console.log('   2. Section Authentication > Users');
      console.log('   3. Trouver l\'utilisateur: associations@kreadev.org');
      console.log('   4. Cliquer sur "..." > "Reset password"');
      console.log('   5. Entrer le nouveau mot de passe: Valentin@100');
      return;
    }
    
    console.log('\n🔑 Clé service_role trouvée, tentative de changement...');
    
    // Créer le client admin avec la clé service_role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Changer le mot de passe de l'utilisateur
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      '0121fe72-0656-4d22-84f2-fd336f062604', // ID de Mixx Party
      { password: 'Valentin@100' }
    );
    
    if (error) {
      console.error('❌ Erreur lors du changement de mot de passe:', error);
      console.log('\n⚠️  Méthode alternative:');
      console.log('   1. Aller dans le dashboard Supabase');
      console.log('   2. Section Authentication > Users');
      console.log('   3. Trouver l\'utilisateur: associations@kreadev.org');
      console.log('   4. Cliquer sur "..." > "Reset password"');
      console.log('   5. Entrer le nouveau mot de passe: Valentin@100');
      return;
    }
    
    console.log('✅ Mot de passe changé avec succès !');
    console.log('📧 Email: associations@kreadev.org');
    console.log('🔑 Nouveau mot de passe: Valentin@100');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    console.log('\n⚠️  Méthode manuelle recommandée:');
    console.log('   1. Aller dans le dashboard Supabase');
    console.log('   2. Section Authentication > Users');
    console.log('   3. Trouver l\'utilisateur: associations@kreadev.org');
    console.log('   4. Cliquer sur "..." > "Reset password"');
    console.log('   5. Entrer le nouveau mot de passe: Valentin@100');
  }
}

changeMixxPartyPassword();
