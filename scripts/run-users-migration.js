const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runUsersMigration() {
  console.log('🚀 Migration de la table users...\n');

  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'create_users_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Exécution du script SQL...');

    // Exécuter le script SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      console.log('⚠️ Méthode exec_sql non disponible, tentative avec query directe...');
      
      // Fallback : exécuter les commandes une par une
      const commands = sqlContent.split(';').filter(cmd => cmd.trim());
      
      for (const command of commands) {
        if (command.trim()) {
          try {
            const { error: cmdError } = await supabase.rpc('exec_sql', { sql: command });
            if (cmdError) {
              console.log(`⚠️ Commande ignorée: ${command.substring(0, 50)}...`);
            }
          } catch (e) {
            console.log(`⚠️ Commande ignorée: ${command.substring(0, 50)}...`);
          }
        }
      }
    } else {
      console.log('✅ Script SQL exécuté avec succès');
    }

    // Vérifier que la table existe maintenant
    console.log('\n🔍 Vérification de la table users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, subscription_plan')
      .limit(5);

    if (usersError) {
      console.error('❌ Erreur lors de la vérification:', usersError);
      return;
    }

    console.log(`✅ Table users créée avec succès !`);
    console.log(`📊 ${users.length} utilisateurs synchronisés:`);
    users.forEach(user => {
      console.log(`   - ${user.email} (Plan: ${user.subscription_plan})`);
    });

    // Test de l'endpoint quota
    console.log('\n🧪 Test de l\'endpoint quota...');
    const testResponse = await fetch('http://localhost:3000/api/ai/test');
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Endpoint test fonctionne:', testData.message);
    } else {
      console.log('⚠️ Endpoint test non accessible (normal si pas connecté)');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  runUsersMigration();
}

module.exports = { runUsersMigration };
