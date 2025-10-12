const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMeteoTables() {
  try {
    console.log('🚀 Création des tables météo...');
    
    // Créer la table meteo_bulletins
    const { data: tableResult, error: tableError } = await supabase
      .from('meteo_bulletins')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === 'PGRST116') {
      console.log('📊 Table meteo_bulletins non trouvée, création nécessaire...');
      console.log('⚠️  Veuillez exécuter le SQL suivant dans l\'interface Supabase :');
      console.log('');
      console.log('-- Table pour les bulletins météo');
      console.log('CREATE TABLE IF NOT EXISTS meteo_bulletins (');
      console.log('    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
      console.log('    title TEXT,');
      console.log('    content TEXT,');
      console.log('    image_url TEXT NOT NULL,');
      console.log('    image_public_id TEXT NOT NULL,');
      console.log('    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,');
      console.log('    is_current BOOLEAN DEFAULT false,');
      console.log('    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      console.log(');');
      console.log('');
      console.log('-- Index et RLS à ajouter ensuite');
    } else if (tableError) {
      console.error('❌ Erreur vérification table:', tableError);
    } else {
      console.log('✅ Table meteo_bulletins existe déjà');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createMeteoTables();
