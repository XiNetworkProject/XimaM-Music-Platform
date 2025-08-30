const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRLSPolicies() {
  try {
    console.log('🔍 Vérification des politiques RLS...');
    
    // Test 1: Vérifier si RLS est activé
    console.log('\n📋 Test 1: Vérification RLS activé...');
    const { data: rlsData, error: rlsError } = await supabase
      .from('tracks')
      .select('*')
      .limit(1);
    
    if (rlsError) {
      console.log('❌ RLS actif (accès bloqué):', rlsError.message);
    } else {
      console.log('⚠️ RLS désactivé (accès libre)');
    }
    
    // Test 2: Vérifier les politiques existantes via une requête SQL
    console.log('\n📋 Test 2: Tentative de lecture des politiques...');
    try {
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies_info', { table_name: 'tracks' });
      
      if (policiesError) {
        console.log('❌ Impossible de lire les politiques:', policiesError.message);
      } else {
        console.log('✅ Politiques récupérées:', policies);
      }
    } catch (error) {
      console.log('❌ Fonction RPC non disponible');
    }
    
    // Test 3: Test d'authentification
    console.log('\n📋 Test 3: Test d\'authentification...');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Non authentifié:', authError.message);
    } else {
      console.log('✅ Authentifié:', authData.user.email);
      console.log('🆔 User ID:', authData.user.id);
    }
    
    // Test 4: Test d'insertion avec authentification
    if (authData?.user?.id) {
      console.log('\n📋 Test 4: Test d\'insertion authentifié...');
      const testTrack = {
        id: `test_auth_${Date.now()}`,
        title: 'Test Track Auth',
        description: 'Test Description Auth',
        genre: ['Test'],
        audio_url: 'https://test.com/test.mp3',
        cover_url: null,
        duration: 120,
        creator_id: authData.user.id, // Utiliser l'ID de l'utilisateur authentifié
        is_public: true,
        plays: 0,
        likes: 0,
        is_featured: false
      };
      
      console.log('📝 Tentative d\'insertion avec:', testTrack);
      
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
      } else {
        console.log('✅ Insertion réussie !');
        console.log('📊 Piste créée:', insertData);
        
        // Nettoyage
        const { error: deleteError } = await supabase
          .from('tracks')
          .delete()
          .eq('id', testTrack.id);
        
        if (deleteError) {
          console.log('⚠️ Erreur lors du nettoyage:', deleteError.message);
        } else {
          console.log('✅ Piste de test supprimée');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkRLSPolicies();
