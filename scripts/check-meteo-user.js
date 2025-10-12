const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMeteoUser() {
  try {
    console.log('🔍 Vérification de l\'utilisateur météo...');
    
    // Vérifier le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'alertempsfrance@gmail.com')
      .single();

    if (profileError) {
      console.error('❌ Erreur récupération profil:', profileError);
      return;
    }

    console.log('✅ Profil trouvé:', profile);

    // Vérifier l'utilisateur Auth
    const { data: users, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erreur récupération utilisateurs:', authError);
      return;
    }

    const meteoUser = users.users.find(u => u.email === 'alertempsfrance@gmail.com');
    
    if (meteoUser) {
      console.log('✅ Utilisateur Auth trouvé:', {
        id: meteoUser.id,
        email: meteoUser.email,
        created_at: meteoUser.created_at
      });
    } else {
      console.log('❌ Utilisateur Auth non trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkMeteoUser();
