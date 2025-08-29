const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function compareCollections() {
  console.log('🔍 COMPARAISON COMPLÈTE MongoDB ↔ Supabase');
  console.log('==========================================');
  
  try {
    // Connexion MongoDB
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    
    // Récupérer toutes les collections MongoDB
    const collections = await db.listCollections().toArray();
    console.log(`\n📊 Collections MongoDB trouvées: ${collections.length}`);
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n🔍 Collection: ${collectionName}`);
      
      try {
        // Compter les documents MongoDB
        const mongoCount = await db.collection(collectionName).countDocuments();
        console.log(`   📊 MongoDB: ${mongoCount} documents`);
        
        // Vérifier la table correspondante dans Supabase
        let supabaseCount = 0;
        let supabaseError = null;
        
        try {
          // Mapping des noms de collections vers les tables Supabase
          const tableMapping = {
            'users': 'profiles',
            'tracks': 'tracks',
            'playlists': 'playlists',
            'comments': 'comments',
            'conversations': 'conversations',
            'messages': 'messages',
            'subscriptions': 'subscriptions',
            'payments': 'payments',
            'userstatuses': 'profiles', // Intégré dans profiles
            'usersubscriptions': 'subscriptions', // Intégré dans subscriptions
            'test_connection': 'N/A'
          };
          
          const supabaseTable = tableMapping[collectionName];
          
          if (supabaseTable && supabaseTable !== 'N/A') {
            const { count, error } = await supabase
              .from(supabaseTable)
              .select('*', { count: 'exact', head: true });
            
            if (error) {
              supabaseError = error;
            } else {
              supabaseCount = count || 0;
            }
            
            console.log(`   📊 Supabase (${supabaseTable}): ${supabaseCount} enregistrements`);
            
            // Calculer la différence
            const difference = mongoCount - supabaseCount;
            if (difference > 0) {
              console.log(`   ⚠️  MANQUANT: ${difference} documents non migrés`);
            } else if (difference < 0) {
              console.log(`   ⚠️  SUPPLÉMENTAIRE: ${Math.abs(difference)} documents en trop`);
            } else {
              console.log(`   ✅ SYNCHRONISÉ: MongoDB et Supabase identiques`);
            }
          } else {
            console.log(`   ⚠️  Pas de table correspondante dans Supabase`);
          }
          
        } catch (error) {
          console.log(`   ❌ Erreur Supabase: ${error.message}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erreur MongoDB: ${error.message}`);
      }
    }
    
    await mongoClient.close();
    
  } catch (error) {
    console.error('❌ Erreur lors de la comparaison:', error);
  }
}

async function checkSupabaseTables() {
  console.log('\n🔍 TABLES SUPABASE DISPONIBLES');
  console.log('==============================');
  
  try {
    // Vérifier les tables existantes
    const tables = [
      'profiles', 'tracks', 'playlists', 'comments', 
      'conversations', 'messages', 'subscriptions', 'payments'
    ];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ ${table}: Erreur - ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: ${count || 0} enregistrements`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: Erreur - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur vérification tables Supabase:', error);
  }
}

async function detailedMongoAnalysis() {
  console.log('\n🔍 ANALYSE DÉTAILLÉE MONGODB');
  console.log('==============================');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    
    // Analyser chaque collection en détail
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionName = collection.name;
      if (collectionName === 'test_connection') continue;
      
      console.log(`\n📊 Collection: ${collectionName}`);
      
      try {
        // Récupérer quelques exemples
        const samples = await db.collection(collectionName).find({}).limit(3).toArray();
        
        if (samples.length > 0) {
          console.log(`   📋 Exemples de documents:`);
          samples.forEach((doc, index) => {
            console.log(`      ${index + 1}. ID: ${doc._id}`);
            console.log(`         Champs: ${Object.keys(doc).join(', ')}`);
            
            // Afficher quelques valeurs importantes
            if (doc.name) console.log(`         Nom: ${doc.name}`);
            if (doc.title) console.log(`         Titre: ${doc.title}`);
            if (doc.content) console.log(`         Contenu: ${doc.content?.substring(0, 50)}...`);
            if (doc.email) console.log(`         Email: ${doc.email}`);
          });
        }
        
        // Compter les documents
        const totalCount = await db.collection(collectionName).countDocuments();
        console.log(`   📊 Total: ${totalCount} documents`);
        
      } catch (error) {
        console.log(`   ❌ Erreur analyse: ${error.message}`);
      }
    }
    
    await mongoClient.close();
    
  } catch (error) {
    console.error('❌ Erreur analyse MongoDB:', error);
  }
}

async function main() {
  console.log('🚀 DIAGNOSTIC COMPLET DE LA MIGRATION');
  console.log('=====================================');
  
  try {
    await compareCollections();
    await checkSupabaseTables();
    await detailedMongoAnalysis();
    
    console.log('\n🎯 RÉSUMÉ DES ACTIONS NÉCESSAIRES');
    console.log('===================================');
    console.log('1. Identifier les collections non migrées');
    console.log('2. Créer les tables manquantes dans Supabase');
    console.log('3. Migrer les données manquantes');
    console.log('4. Vérifier l\'intégrité des relations');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    process.exit(1);
  }
}

// Lancer le diagnostic
if (require.main === module) {
  main();
}
