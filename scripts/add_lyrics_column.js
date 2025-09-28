const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addLyricsColumn() {
  try {
    console.log('🔄 Ajout de la colonne lyrics à la table tracks...');
    
    // Vérifier si la colonne existe déjà
    const { data: columns, error: checkError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'tracks' 
          AND table_schema = 'public'
          AND column_name = 'lyrics'
        `
      });

    if (checkError) {
      console.log('⚠️ Impossible de vérifier l\'existence de la colonne, tentative d\'ajout...');
    } else if (columns && columns.length > 0) {
      console.log('✅ La colonne lyrics existe déjà');
      return;
    }

    // Ajouter la colonne lyrics
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          ALTER TABLE public.tracks 
          ADD COLUMN IF NOT EXISTS lyrics TEXT;
        `
      });

    if (error) {
      console.error('❌ Erreur lors de l\'ajout de la colonne:', error);
      return;
    }

    console.log('✅ Colonne lyrics ajoutée avec succès à la table tracks');

    // Vérifier que la colonne a été ajoutée
    const { data: verifyColumns, error: verifyError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'tracks' 
          AND table_schema = 'public'
          AND column_name = 'lyrics'
        `
      });

    if (verifyError) {
      console.log('⚠️ Impossible de vérifier l\'ajout de la colonne');
    } else if (verifyColumns && verifyColumns.length > 0) {
      console.log('✅ Vérification réussie - colonne lyrics présente:', verifyColumns[0]);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le script
addLyricsColumn().then(() => {
  console.log('🎉 Script terminé');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
