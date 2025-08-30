const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSupabaseUpload() {
  try {
    console.log('🧪 Test de connexion Supabase...');
    
    // Test 1: Connexion de base
    const { data: testData, error: testError } = await supabase
      .from('tracks')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erreur de connexion:', testError);
      return;
    }
    
    console.log('✅ Connexion Supabase OK');
    
    // Test 2: Structure de la table tracks
    console.log('🔍 Test de la structure de la table tracks...');
    const { data: columns, error: columnsError } = await supabase
      .from('tracks')
      .select('*')
      .limit(1);
    
    if (columnsError) {
      console.error('❌ Erreur lors de la lecture de la table:', columnsError);
      return;
    }
    
    console.log('✅ Table tracks accessible');
    
    // Test 3: Tentative d'insertion
    console.log('🔍 Test d\'insertion d\'une piste...');
    const testTrack = {
      id: `test_${Date.now()}`,
      title: 'Test Track',
      description: 'Test Description',
      genre: ['Test'],
      audio_url: 'https://test.com/test.mp3',
      cover_url: null,
      duration: 120,
      creator_id: '35ed4720-3878-4aaa-bb6c-9fbe75c3f634', // ID de test
      is_public: true,
      plays: 0,
      likes: 0,
      is_featured: false
    };
    
    console.log('📝 Données de test:', testTrack);
    
    const { data: insertData, error: insertError } = await supabase
      .from('tracks')
      .insert(testTrack)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erreur lors de l\'insertion:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return;
    }
    
    console.log('✅ Insertion réussie !');
    console.log('📊 Piste créée:', insertData);
    
    // Test 4: Nettoyage (suppression de la piste de test)
    console.log('🧹 Nettoyage de la piste de test...');
    const { error: deleteError } = await supabase
      .from('tracks')
      .delete()
      .eq('id', testTrack.id);
    
    if (deleteError) {
      console.error('⚠️ Erreur lors du nettoyage:', deleteError.message);
    } else {
      console.log('✅ Piste de test supprimée');
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testSupabaseUpload();
