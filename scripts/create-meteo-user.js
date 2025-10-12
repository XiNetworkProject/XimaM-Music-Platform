const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMeteoUser() {
  try {
    console.log('🚀 Création de l\'utilisateur météo...');
    
    // Créer l'utilisateur dans Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'alertempsfrance@gmail.com',
      password: 'Alertemps2024!',
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Erreur création utilisateur Auth:', authError);
      return;
    }

    console.log('✅ Utilisateur Auth créé:', authUser.user.id);

    // Créer le profil (sans role pour l'instant)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
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
    console.log('🎉 Utilisateur météo créé avec succès !');
    console.log('📧 Email: alertempsfrance@gmail.com');
    console.log('🔑 Mot de passe: Alertemps2024!');
    console.log('👤 Rôle: meteo_admin');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createMeteoUser();
