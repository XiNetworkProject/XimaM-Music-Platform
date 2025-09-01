const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function changeValentinPassword() {
  try {
    console.log('🔐 Changement du mot de passe de Valentin...');
    
    // Rechercher l'utilisateur Valentin
    console.log('\n🔍 Recherche de l\'utilisateur Valentin...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, name, email')
      .or('username.ilike.valentin,name.ilike.valentin');
    
    if (profilesError) {
      console.error('❌ Erreur lors de la recherche:', profilesError);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('❌ Aucun utilisateur nommé Valentin trouvé');
      return;
    }
    
    console.log('✅ Utilisateurs trouvés:', profiles.length);
    profiles.forEach(profile => {
      console.log(`  - ID: ${profile.id}`);
      console.log(`    Username: ${profile.username || 'N/A'}`);
      console.log(`    Name: ${profile.name || 'N/A'}`);
      console.log(`    Email: ${profile.email || 'N/A'}`);
      console.log('');
    });
    
    // Note: Pour changer le mot de passe dans Supabase, nous devons utiliser l'API d'authentification
    // car les mots de passe sont gérés par le système d'auth, pas dans la table profiles
    console.log('⚠️  IMPORTANT: Pour changer le mot de passe dans Supabase, vous devez:');
    console.log('   1. Aller dans le dashboard Supabase');
    console.log('   2. Section Authentication > Users');
    console.log('   3. Trouver l\'utilisateur Valentin');
    console.log('   4. Cliquer sur "..." > "Reset password"');
    console.log('   5. Ou utiliser l\'API d\'authentification avec admin privileges');
    
    // Alternative: Utiliser l'API d'authentification (nécessite service_role key)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n🔑 Tentative avec la clé service_role...');
      
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Note: Cette méthode nécessite que l'utilisateur soit connecté ou que nous ayons son email
      console.log('📧 Pour changer le mot de passe, nous avons besoin de l\'email de Valentin');
      console.log('   ou que l\'utilisateur soit connecté pour utiliser updateUser()');
      
    } else {
      console.log('\n❌ Clé SUPABASE_SERVICE_ROLE_KEY non trouvée dans .env.local');
      console.log('   Ajoutez cette clé pour pouvoir changer les mots de passe programmatiquement');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

changeValentinPassword();
