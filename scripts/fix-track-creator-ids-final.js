require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { MongoClient, ObjectId } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');

const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function fixTrackCreatorIdsFinal() {
  console.log('🔧 Correction finale des creator_id avec mapping MongoDB → Supabase...');
  
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
      } else {
        console.log(`   ❌ Aucune correspondance trouvée pour ${mongoUsername}`);
      }
    }
    
    console.log(`\n📊 Mapping créé: ${idMapping.size} correspondances trouvées`);
    
    // 2. Récupérer les tracks avec creator_id = null
    const { data: tracksWithNullCreator, error: tracksError } = await supabase
      .from('tracks')
      .select('id, title')
      .is('creator_id', null);
    
    if (tracksError) {
      console.error('❌ Erreur récupération tracks:', tracksError);
      return;
    }
    
    console.log(`\n📊 ${tracksWithNullCreator.length} tracks avec creator_id = null trouvées`);
    
    // 3. Corriger les creator_id en utilisant le mapping
    let updatedCount = 0;
    
    for (const track of tracksWithNullCreator) {
      console.log(`🔍 Correction de: ${track.title} (${track.id})`);
      
      try {
        // Convertir l'ID string en ObjectId pour MongoDB
        const objectId = new ObjectId(track.id);
        
        // Chercher dans MongoDB par l'ancien _id (ObjectId)
        const mongoTrack = await db.collection('tracks').findOne({ _id: objectId });
        
        if (mongoTrack && mongoTrack.artist) {
          // Convertir l'ObjectId artist en string pour le mapping
          const mongoArtistIdString = mongoTrack.artist.toString();
          console.log(`   Artiste MongoDB: ${mongoArtistIdString}`);
          
          // Chercher le nouvel ID Supabase dans le mapping
          const newSupabaseId = idMapping.get(mongoArtistIdString);
          
          if (newSupabaseId) {
            console.log(`   → Nouvel ID Supabase: ${newSupabaseId}`);
            
            // Mettre à jour le creator_id
            const { error: updateError } = await supabase
              .from('tracks')
              .update({ creator_id: newSupabaseId })
              .eq('id', track.id);
            
            if (updateError) {
              console.error(`   ❌ Erreur mise à jour:`, updateError);
            } else {
              console.log(`   ✅ Creator_id mis à jour: ${newSupabaseId}`);
              updatedCount++;
            }
          } else {
            console.log(`   ❌ Aucun mapping trouvé pour l'artiste: ${mongoArtistIdString}`);
          }
        } else {
          console.log(`   ⚠️ Aucune information d'artiste trouvée dans MongoDB`);
        }
      } catch (objectIdError) {
        console.error(`   ❌ Erreur conversion ID en ObjectId: ${track.id}`, objectIdError.message);
      }
    }
    
    await mongoClient.close();
    
    console.log(`\n🎉 Correction terminée: ${updatedCount}/${tracksWithNullCreator.length} tracks mises à jour`);
    
    // 4. Vérifier le résultat
    const { data: remainingNulls, error: checkError } = await supabase
      .from('tracks')
      .select('id, title')
      .is('creator_id', null);
    
    if (!checkError) {
      console.log(`📊 Tracks restantes avec creator_id = null: ${remainingNulls.length}`);
      if (remainingNulls.length > 0) {
        console.log('   Tracks non corrigées:');
        remainingNulls.forEach(track => console.log(`   - ${track.title} (${track.id})`));
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Lancer la correction
if (require.main === module) {
  fixTrackCreatorIdsFinal();
}
