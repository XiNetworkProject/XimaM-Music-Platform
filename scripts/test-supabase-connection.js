const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.log('Vérifiez que vous avez :');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialiser les clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('🔌 Test de connexion Supabase...');
  
  try {
    // Test avec la clé anonyme
    const { data: publicData, error: publicError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (publicError) {
      console.log('⚠️ Connexion anonyme :', publicError.message);
    } else {
      console.log('✅ Connexion anonyme réussie');
    }
    
    // Test avec la clé de service
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (adminError) {
      console.log('⚠️ Connexion admin :', adminError.message);
    } else {
      console.log('✅ Connexion admin réussie');
    }
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
  }
}

async function testTables() {
  console.log('\n📊 Test des tables...');
  
  const tables = [
    'profiles',
    'tracks', 
    'playlists',
    'comments',
    'messages',
    'conversations',
    'user_follows',
    'track_likes',
    'playlist_tracks'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table} : ${error.message}`);
      } else {
        console.log(`✅ Table ${table} accessible`);
      }
    } catch (error) {
      console.log(`❌ Table ${table} : Erreur inconnue`);
    }
  }
}

async function testFunctions() {
  console.log('\n⚙️ Test des fonctions...');
  
  try {
    // Test de la fonction get_user_stats
    const { data: statsData, error: statsError } = await supabaseAdmin
      .rpc('get_user_stats', { user_uuid: '00000000-0000-0000-0000-000000000001' });
    
    if (statsError) {
      console.log('⚠️ Fonction get_user_stats :', statsError.message);
    } else {
      console.log('✅ Fonction get_user_stats accessible');
    }
    
    // Test de la fonction search_tracks
    const { data: searchData, error: searchError } = await supabaseAdmin
      .rpc('search_tracks', { search_query: 'test' });
    
    if (searchError) {
      console.log('⚠️ Fonction search_tracks :', searchError.message);
    } else {
      console.log('✅ Fonction search_tracks accessible');
    }
    
  } catch (error) {
    console.error('❌ Erreur test fonctions:', error.message);
  }
}

async function testViews() {
  console.log('\n👁️ Test des vues...');
  
  const views = [
    'trending_tracks',
    'recent_activity'
  ];
  
  for (const view of views) {
    try {
      const { data, error } = await supabaseAdmin
        .from(view)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Vue ${view} : ${error.message}`);
      } else {
        console.log(`✅ Vue ${view} accessible`);
      }
    } catch (error) {
      console.log(`❌ Vue ${view} : Erreur inconnue`);
    }
  }
}

async function testRLS() {
  console.log('\n🔒 Test des politiques RLS...');
  
  try {
    // Test d'insertion sans authentification (doit échouer)
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        name: 'Test User',
        email: 'test@test.com',
        username: 'testuser'
      });
    
    if (insertError && insertError.message.includes('policy')) {
      console.log('✅ Politique RLS active (insertion bloquée)');
    } else {
      console.log('⚠️ Politique RLS non configurée correctement');
    }
    
    // Test de lecture (doit réussir)
    const { data: readData, error: readError } = await supabase
      .from('profiles')
      .select('name')
      .limit(1);
    
    if (readError) {
      console.log('❌ Lecture bloquée par RLS');
    } else {
      console.log('✅ Lecture autorisée par RLS');
    }
    
  } catch (error) {
    console.error('❌ Erreur test RLS:', error.message);
  }
}

async function main() {
  console.log('🧪 Test de Configuration Supabase');
  console.log('==================================');
  
  await testConnection();
  await testTables();
  await testFunctions();
  await testViews();
  await testRLS();
  
  console.log('\n🎉 Tests terminés !');
  console.log('\n📋 Prochaines étapes :');
  console.log('1. Vérifier les erreurs ci-dessus');
  console.log('2. Corriger les problèmes de configuration');
  console.log('3. Relancer les tests si nécessaire');
  console.log('4. Procéder à la migration des données');
}

main().catch(console.error);
