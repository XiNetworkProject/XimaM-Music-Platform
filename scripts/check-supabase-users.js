require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');

const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function checkSupabaseUsers() {
  console.log('🔍 Vérification des utilisateurs dans Supabase vs MongoDB...');
  
  try {
    // 1. Récupérer tous les utilisateurs depuis Supabase
    const { data: supabaseUsers, error: supabaseError } = await supabase
      .from('profiles')
      .select('id, username, email');
    
    if (supabaseError) {
      console.error('❌ Erreur Supabase:', supabaseError);
      return;
    }
    
    console.log(`📊 ${supabaseUsers.length} utilisateurs dans Supabase:`);
    supabaseUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - ID: ${user.id}`);
    });
    
    // 2. Se connecter à MongoDB pour comparer
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    
    const mongoUsers = await db.collection('users').find({}).toArray();
    console.log(`\n📊 ${mongoUsers.length} utilisateurs dans MongoDB:`);
    mongoUsers.forEach(user => {
      console.log(`   - ${user.username || user.email} - ID: ${user._id}`);
    });
    
    // 3. Identifier les utilisateurs manquants dans Supabase
    console.log('\n🔍 Utilisateurs manquants dans Supabase:');
    const missingUsers = [];
    
    for (const mongoUser of mongoUsers) {
      const mongoUserId = mongoUser._id.toString();
      const existsInSupabase = supabaseUsers.some(supabaseUser => supabaseUser.id === mongoUserId);
      
      if (!existsInSupabase) {
        missingUsers.push(mongoUser);
        console.log(`   ❌ ${mongoUser.username || mongoUser.email} (${mongoUserId})`);
      }
    }
    
    console.log(`\n📋 Total utilisateurs manquants: ${missingUsers.length}`);
    
    if (missingUsers.length > 0) {
      console.log('\n💡 Ces utilisateurs doivent être migrés vers Supabase pour corriger les creator_id des tracks');
    }
    
    await mongoClient.close();
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Lancer la vérification
if (require.main === module) {
  checkSupabaseUsers();
}
