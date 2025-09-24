// Script Node.js pour changer le mot de passe via l'API Supabase Admin
// Exécuter avec: node scripts/change_password_admin.js

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase Admin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function changePassword() {
  try {
    const email = 'evannlargersie30@gmail.com';
    const newPassword = 'GoLLoum36012';

    console.log(`🔄 Changement du mot de passe pour: ${email}`);

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
