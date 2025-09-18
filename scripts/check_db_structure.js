require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  try {
    console.log('🔍 Vérification de la structure de ai_generations...');
    
    // Vérifier les colonnes de ai_generations
    const { data: columns, error: columnsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'ai_generations' 
          ORDER BY ordinal_position;
        `
      });

    if (columnsError) {
      console.error('❌ Erreur lors de la vérification des colonnes:', columnsError);
      return;
    }

    console.log('📊 Colonnes de ai_generations:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });

    // Vérifier les contraintes
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = 'ai_generations'
          ORDER BY tc.constraint_type;
        `
      });

    if (constraintsError) {
      console.error('❌ Erreur lors de la vérification des contraintes:', constraintsError);
      return;
    }

    console.log('\n🔒 Contraintes de ai_generations:');
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type} sur ${constraint.column_name}`);
    });

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

checkTableStructure();
