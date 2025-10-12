const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMeteoProfile() {
  try {
    console.log('🔍 Recherche de l\'utilisateur Auth...');
    
    // Récupérer l'utilisateur Auth
    const { data: users, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erreur récupération utilisateurs:', authError);
      return;
    }

    const meteoUser = users.users.find(u => u.email === 'alertempsfrance@gmail.com');
    
    if (!meteoUser) {
      console.error('❌ Utilisateur Auth non trouvé');
      return;
    }

    console.log('✅ Utilisateur Auth trouvé:', meteoUser.id);

    // Créer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: meteoUser.id,
        name: 'Alertemps France',
        username: 'alertemps',
        email: 'alertempsfrance@gmail.com'
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Erreur création profil:', profileError);
      return;
    }

    console.log('✅ Profil créé:', profile);
    console.log('🎉 Utilisateur météo configuré !');
    console.log('📧 Email: alertempsfrance@gmail.com');
    console.log('🔑 Mot de passe: Alertemps2024!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createMeteoProfile();
