const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createActiveMembersFunction() {
  console.log('🚀 Création de la fonction get_active_members_count...');

  try {
    // Créer la fonction SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_active_members_count()
        RETURNS INTEGER AS $$
        DECLARE
            active_count INTEGER;
            thirty_days_ago TIMESTAMP WITH TIME ZONE;
        BEGIN
            -- Calculer la date d'il y a 30 jours
            thirty_days_ago := NOW() - INTERVAL '30 days';
            
            -- Compter les utilisateurs uniques qui ont posté ou répondu dans les 30 derniers jours
            SELECT COUNT(DISTINCT user_id) INTO active_count
            FROM (
                -- Utilisateurs ayant posté dans les 30 derniers jours
                SELECT user_id FROM forum_posts 
                WHERE created_at >= thirty_days_ago
                
                UNION
                
                -- Utilisateurs ayant répondu dans les 30 derniers jours
                SELECT user_id FROM forum_replies 
                WHERE created_at >= thirty_days_ago
            ) AS active_users;
            
            RETURN COALESCE(active_count, 0);
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.error('❌ Erreur création fonction:', error);
      return;
    }

    console.log('✅ Fonction get_active_members_count créée');

    // Tester la fonction
    console.log('🧪 Test de la fonction...');
    const { data: testResult, error: testError } = await supabase.rpc('get_active_members_count');
    
    if (testError) {
      console.error('❌ Erreur test fonction:', testError);
    } else {
      console.log(`✅ Test réussi: ${testResult} membres actifs`);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

createActiveMembersFunction();
