require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { MongoClient, ObjectId } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');

const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function debugMapping() {
  console.log('🔍 Debug du mapping MongoDB → Supabase...');
  
  try {
    // 1. Créer le mapping des utilisateurs MongoDB → Supabase
    console.log('📋 Création du mapping des utilisateurs...');
    
    const { data: supabaseUsers, error: supabaseError } = await supabase
      .from('profiles')
      .select('id, username, email');
    
    if (supabaseError) {
      console.error('❌ Erreur Supabase:', supabaseError);
      return;
    }
    
    // Se connecter à MongoDB pour récupérer les utilisateurs
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    
    const mongoUsers = await db.collection('users').find({}).toArray();
    
    // Créer le mapping par username/email
    const idMapping = new Map();
    
    for (const mongoUser of mongoUsers) {
      const mongoUsername = mongoUser.username;
      const mongoEmail = mongoUser.email;
      
      // Chercher l'utilisateur correspondant dans Supabase
      const supabaseUser = supabaseUsers.find(supabaseUser => 
        supabaseUser.username === mongoUsername || supabaseUser.email === mongoEmail
      );
      
      if (supabaseUser) {
        const mongoIdString = mongoUser._id.toString();
        idMapping.set(mongoIdString, supabaseUser.id);
        console.log(`   ✅ ${mongoUsername} (${mongoIdString}) → ${supabaseUser.id}`);
        
        // Debug: vérifier le type et la valeur exacte
        console.log(`      mongoIdString type: ${typeof mongoIdString}, valeur: "${mongoIdString}"`);
        console.log(`      mongoIdString length: ${mongoIdString.length}`);
      } else {
        console.log(`   ❌ Aucune correspondance trouvée pour ${mongoUsername}`);
      }
    }
    
    console.log(`\n📊 Mapping créé: ${idMapping.size} correspondances trouvées`);
    
    // Debug: afficher toutes les clés du mapping
    console.log('\n🔑 Clés du mapping:');
    for (const [key, value] of idMapping.entries()) {
      console.log(`   "${key}" → ${value}`);
    }
    
    // 2. Tester avec une track spécifique
    console.log('\n🧪 Test avec une track spécifique...');
    const testTrackId = '685b219cc3893296436a0efa'; // Voix des créations 3
    
    try {
      const objectId = new ObjectId(testTrackId);
      const mongoTrack = await db.collection('tracks').findOne({ _id: objectId });
      
      if (mongoTrack && mongoTrack.artist) {
        const mongoArtistId = mongoTrack.artist;
        console.log(`Track: ${mongoTrack.title}`);
        console.log(`Artiste MongoDB: "${mongoArtistId}"`);
        console.log(`Artiste MongoDB type: ${typeof mongoArtistId}`);
        console.log(`Artiste MongoDB length: ${mongoArtistId.length}`);
        
        // Test du mapping
        console.log('\nTest du mapping:');
        console.log(`idMapping.has("${mongoArtistId}"): ${idMapping.has(mongoArtistId)}`);
        
        // Vérifier si la clé existe avec différentes variations
        const variations = [
          mongoArtistId,
          mongoArtistId.toString(),
          mongoArtistId + '',
          String(mongoArtistId)
        ];
        
        variations.forEach((variation, index) => {
          console.log(`Variation ${index}: "${variation}" → ${idMapping.has(variation)}`);
        });
        
        // Chercher la clé exacte
        let foundKey = null;
        for (const [key, value] of idMapping.entries()) {
          if (key === mongoArtistId) {
            foundKey = key;
            break;
          }
        }
        
        if (foundKey) {
          console.log(`✅ Clé trouvée: "${foundKey}" → ${idMapping.get(foundKey)}`);
        } else {
          console.log(`❌ Aucune clé exacte trouvée`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur test:', error);
    }
    
    await mongoClient.close();
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Lancer le debug
if (require.main === module) {
  debugMapping();
}
