require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');

const config = require('./migrate-config');

// Initialiser Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

async function fixTrackCreatorIdsV2() {
  console.log('🔧 Correction des creator_id manquants dans la table tracks (V2)...');
  
  try {
    // 1. Récupérer les tracks depuis Supabase qui ont creator_id = null
    const { data: tracksWithNullCreator, error: supabaseError } = await supabase
      .from('tracks')
      .select('id, title')
      .is('creator_id', null);
    
    if (supabaseError) {
      console.error('❌ Erreur Supabase:', supabaseError);
      return;
    }
    
    console.log(`📊 ${tracksWithNullCreator.length} tracks avec creator_id = null trouvées`);
    
    if (tracksWithNullCreator.length === 0) {
      console.log('✅ Aucune correction nécessaire');
      return;
    }
    
    // 2. Se connecter à MongoDB pour récupérer les informations originales
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    
    // 3. Pour chaque track, essayer de trouver le creator_id
    let updatedCount = 0;
    
    for (const track of tracksWithNullCreator) {
      console.log(`🔍 Recherche du creator pour: ${track.title} (${track.id})`);
      
      // Chercher dans MongoDB par l'ancien _id
      const mongoTrack = await db.collection('tracks').findOne({ _id: track.id });
      
      if (mongoTrack && mongoTrack.artist) {
        // L'artiste est stocké comme un string ID dans MongoDB
        const artistId = mongoTrack.artist;
        
        console.log(`   Artiste trouvé dans MongoDB: ${artistId}`);
        
        // Chercher l'utilisateur correspondant dans Supabase
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', artistId)
          .single();
        
        if (user && !userError) {
          // Mettre à jour le creator_id
          const { error: updateError } = await supabase
            .from('tracks')
            .update({ creator_id: user.id })
            .eq('id', track.id);
          
          if (updateError) {
            console.error(`   ❌ Erreur mise à jour:`, updateError);
          } else {
            console.log(`   ✅ Creator_id mis à jour: ${user.id}`);
            updatedCount++;
          }
        } else {
          console.log(`   ⚠️ Utilisateur non trouvé dans Supabase: ${artistId}`);
          
          // Vérifier si l'utilisateur existe dans MongoDB
          const mongoUser = await db.collection('users').findOne({ _id: artistId });
          if (mongoUser) {
            console.log(`   ℹ️ Utilisateur existe dans MongoDB: ${mongoUser.username || mongoUser.email}`);
          } else {
            console.log(`   ❌ Utilisateur non trouvé dans MongoDB non plus`);
          }
        }
      } else {
        console.log(`   ⚠️ Aucune information d'artiste trouvée dans MongoDB`);
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
  fixTrackCreatorIdsV2();
}
