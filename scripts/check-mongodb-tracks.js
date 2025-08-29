require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { MongoClient } = require('mongodb');

const config = require('./migrate-config');

async function checkMongoDBTracks() {
  console.log('🔍 Vérification de la structure des tracks dans MongoDB...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    
    // Récupérer quelques tracks pour examiner leur structure
    const tracks = await db.collection('tracks').find({}).limit(5).toArray();
    
    console.log(`📊 ${tracks.length} tracks examinées:\n`);
    
    tracks.forEach((track, index) => {
      console.log(`Track ${index + 1}: ${track.title}`);
      console.log(`  _id: ${track._id}`);
      console.log(`  artist: ${JSON.stringify(track.artist)}`);
      console.log(`  artistId: ${track.artistId}`);
      console.log(`  creator: ${track.creator}`);
      console.log(`  creatorId: ${track.creatorId}`);
      console.log(`  user: ${track.user}`);
      console.log(`  userId: ${track.userId}`);
      console.log(`  uploadedBy: ${track.uploadedBy}`);
      console.log(`  Toutes les clés: ${Object.keys(track).join(', ')}`);
      console.log('');
    });
    
    // Chercher des tracks qui ont des informations d'artiste
    const tracksWithArtist = await db.collection('tracks').find({
      $or: [
        { artist: { $exists: true } },
        { artistId: { $exists: true } },
        { creator: { $exists: true } },
        { creatorId: { $exists: true } },
        { user: { $exists: true } },
        { userId: { $exists: true } },
        { uploadedBy: { $exists: true } }
      ]
    }).limit(3).toArray();
    
    console.log(`\n🎯 Tracks avec informations d'artiste (${tracksWithArtist.length}):`);
    tracksWithArtist.forEach((track, index) => {
      console.log(`\nTrack ${index + 1}: ${track.title}`);
      console.log(`  _id: ${track._id}`);
      if (track.artist) console.log(`  artist: ${JSON.stringify(track.artist)}`);
      if (track.artistId) console.log(`  artistId: ${track.artistId}`);
      if (track.creator) console.log(`  creator: ${track.creator}`);
      if (track.creatorId) console.log(`  creatorId: ${track.creatorId}`);
      if (track.user) console.log(`  user: ${track.user}`);
      if (track.userId) console.log(`  userId: ${track.userId}`);
      if (track.uploadedBy) console.log(`  uploadedBy: ${track.uploadedBy}`);
    });
    
    await mongoClient.close();
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Lancer la vérification
if (require.main === module) {
  checkMongoDBTracks();
}
