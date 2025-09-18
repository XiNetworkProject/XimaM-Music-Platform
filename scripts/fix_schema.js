// scripts/fix_schema.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSchema() {
  try {
    console.log('🔧 Correction du schéma de la base de données...');

    // Ajouter les colonnes manquantes
    const queries = [
      // Colonne title
      `DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'title') THEN
          ALTER TABLE ai_generations ADD COLUMN title VARCHAR(255) DEFAULT 'Musique générée';
          RAISE NOTICE 'Colonne title ajoutée à ai_generations';
        END IF;
      END $$;`,
      
      // Colonne style
      `DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'style') THEN
          ALTER TABLE ai_generations ADD COLUMN style VARCHAR(255) DEFAULT 'Custom';
          RAISE NOTICE 'Colonne style ajoutée à ai_generations';
        END IF;
      END $$;`,
      
      // Colonne completed_at
      `DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_generations' AND column_name = 'completed_at') THEN
          ALTER TABLE ai_generations ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
          RAISE NOTICE 'Colonne completed_at ajoutée à ai_generations';
        END IF;
      END $$;`
    ];

    for (const query of queries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.error('❌ Erreur exécution SQL:', error);
      } else {
        console.log('✅ Requête exécutée avec succès');
      }
    }

    // Vérifier la structure finale
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'ai_generations')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Erreur récupération colonnes:', columnsError);
    } else {
      console.log('📊 Structure finale de ai_generations:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    }

    console.log('✅ Correction du schéma terminée !');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

fixSchema();
