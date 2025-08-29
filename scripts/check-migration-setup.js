const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const config = require('./migrate-config');

async function checkMongoDB() {
  console.log('🔍 Vérification MongoDB...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    
    // Vérifier les collections
    const collections = await db.listCollections().toArray();
    console.log(`✅ MongoDB connecté, ${collections.length} collections trouvées`);
    
    // Compter les documents dans chaque collection
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   📊 ${collection.name}: ${count} documents`);
    }
    
    await mongoClient.close();
    return true;
    
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error.message);
    return false;
  }
}

async function checkSupabase() {
  console.log('🔍 Vérification Supabase...');
  
  try {
    const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    
    // Tester la connexion
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Erreur connexion Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connecté avec succès');
    
    // Vérifier les tables
    const tables = ['profiles', 'tracks', 'playlists', 'comments'];
    for (const table of tables) {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log(`   ⚠️  Table ${table}: Erreur de vérification`);
      } else {
        console.log(`   📊 Table ${table}: ${count} enregistrements`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur connexion Supabase:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Vérification de la configuration de migration');
  console.log('================================================');
  console.log('');
  
  // Vérifier la configuration
  console.log('📋 Configuration :');
  console.log('✅ Supabase URL:', config.supabase.url ? 'Configuré' : '❌ Manquant');
  console.log('✅ Supabase Anon Key:', config.supabase.anonKey ? 'Configuré' : '❌ Manquant');
  console.log('✅ Supabase Service Key:', config.supabase.serviceKey ? 'Configuré' : '❌ Manquant');
  console.log('✅ MongoDB URI:', config.mongodb.uri ? 'Configuré' : '❌ Manquant');
  console.log('');
  
  // Vérifier les connexions
  const mongoOk = await checkMongoDB();
  console.log('');
  
  const supabaseOk = await checkSupabase();
  console.log('');
  
  // Résumé
  if (mongoOk && supabaseOk) {
    console.log('🎉 Configuration OK ! Vous pouvez lancer la migration avec :');
    console.log('   npm run migrate:data');
  } else {
    console.log('❌ Problèmes détectés. Corrigez avant de lancer la migration.');
  }
}

if (require.main === module) {
  main();
}
