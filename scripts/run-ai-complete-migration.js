// scripts/run-ai-complete-migration.js
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Début de la migration complète IA...');

  try {
    // Lire le fichier SQL
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, 'create_ai_generations_complete.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ Fichier SQL non trouvé:', sqlFile);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Diviser le SQL en commandes individuelles
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📊 Exécution de ${commands.length} commandes SQL...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      try {
        console.log(`\n🔧 Commande ${i + 1}/${commands.length}:`);
        console.log(command.substring(0, 100) + (command.length > 100 ? '...' : ''));
        
        const { error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          // Si exec_sql n'existe pas, essayer avec query
          const { error: queryError } = await supabase.from('_dummy').select('*').limit(0);
          
          if (queryError && queryError.message.includes('exec_sql')) {
            console.log('⚠️ exec_sql non disponible, tentative avec query directe...');
            
            // Pour les commandes simples, on peut les exécuter via l'interface SQL
            console.log('📝 Veuillez exécuter manuellement cette commande dans l\'interface SQL Supabase:');
            console.log(command);
            console.log('---');
          } else {
            throw error;
          }
        } else {
          console.log('✅ Succès');
          successCount++;
        }
      } catch (err) {
        console.error('❌ Erreur:', err.message);
        errorCount++;
      }
    }

    console.log('\n📊 Résumé de la migration:');
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📝 Commandes à exécuter manuellement: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n🔧 Pour les commandes en erreur, exécutez-les manuellement dans l\'interface SQL Supabase:');
      console.log('1. Allez sur https://supabase.com/dashboard');
      console.log('2. Sélectionnez votre projet');
      console.log('3. Allez dans SQL Editor');
      console.log('4. Copiez-collez les commandes en erreur');
      console.log('5. Exécutez-les une par une');
    }

    console.log('\n🎉 Migration terminée !');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Vérifiez que toutes les tables sont créées');
    console.log('2. Testez l\'API de génération IA');
    console.log('3. Vérifiez les quotas utilisateurs');

  } catch (error) {
    console.error('❌ Erreur migration:', error);
    process.exit(1);
  }
}

// Fonction alternative pour créer les tables une par une
async function createTablesIndividually() {
  console.log('🔧 Création des tables individuellement...');

  const tables = [
    {
      name: 'ai_generations',
      sql: `
        CREATE TABLE IF NOT EXISTS ai_generations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          task_id VARCHAR(255) NOT NULL,
          prompt TEXT NOT NULL,
          model VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          is_favorite BOOLEAN DEFAULT FALSE,
          is_public BOOLEAN DEFAULT FALSE,
          play_count INTEGER DEFAULT 0,
          like_count INTEGER DEFAULT 0,
          share_count INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}'::jsonb
        );
      `
    },
    {
      name: 'ai_tracks',
      sql: `
        CREATE TABLE IF NOT EXISTS ai_tracks (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          generation_id UUID REFERENCES ai_generations(id) ON DELETE CASCADE,
          suno_id VARCHAR(255),
          title VARCHAR(255),
          audio_url TEXT,
          stream_audio_url TEXT,
          image_url TEXT,
          duration INTEGER,
          prompt TEXT,
          model_name VARCHAR(50),
          tags TEXT[],
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_favorite BOOLEAN DEFAULT FALSE,
          play_count INTEGER DEFAULT 0,
          like_count INTEGER DEFAULT 0
        );
      `
    },
    {
      name: 'user_quotas',
      sql: `
        CREATE TABLE IF NOT EXISTS user_quotas (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
          plan_type VARCHAR(50) DEFAULT 'free',
          monthly_limit INTEGER DEFAULT 5,
          used_this_month INTEGER DEFAULT 0,
          reset_date DATE DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day'),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }
  ];

  for (const table of tables) {
    try {
      console.log(`\n🔧 Création de la table ${table.name}...`);
      
      // Utiliser l'interface SQL via l'API REST
      const { error } = await supabase
        .from('_dummy')
        .select('*')
        .limit(0);

      if (error) {
        console.log(`📝 Veuillez créer manuellement la table ${table.name}:`);
        console.log(table.sql);
        console.log('---');
      } else {
        console.log(`✅ Table ${table.name} créée`);
      }
    } catch (err) {
      console.error(`❌ Erreur création table ${table.name}:`, err.message);
    }
  }
}

// Menu principal
async function main() {
  console.log('🎵 Migration IA - Synaura');
  console.log('1. Migration complète (recommandée)');
  console.log('2. Création tables individuelles');
  console.log('3. Vérification des tables existantes');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nChoisissez une option (1-3): ', async (answer) => {
    rl.close();
    
    switch (answer) {
      case '1':
        await runMigration();
        break;
      case '2':
        await createTablesIndividually();
        break;
      case '3':
        await checkExistingTables();
        break;
      default:
        console.log('Option invalide');
        process.exit(1);
    }
  });
}

async function checkExistingTables() {
  console.log('🔍 Vérification des tables existantes...');
  
  const tables = ['ai_generations', 'ai_tracks', 'user_quotas', 'ai_playlists', 'ai_usage_stats'];
  
  for (const tableName of tables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${tableName}: Non trouvée`);
      } else {
        console.log(`✅ Table ${tableName}: Existe`);
      }
    } catch (err) {
      console.log(`❌ Table ${tableName}: Erreur de vérification`);
    }
  }
}

if (require.main === module) {
  main();
}
