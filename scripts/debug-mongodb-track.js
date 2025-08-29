require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { MongoClient } = require('mongodb');

const config = require('./migrate-config');

async function debugMongoDBTrack() {
  console.log('🔍 Debug d\'une track MongoDB spécifique...');
  
  try {
    const mongoClient = await MongoClient.connect(config.mongodb.uri);
    const db = mongoClient.db();
    
    // Prendre une track spécifique pour debug
    const trackId = '685b219cc3893296436a0efa'; // Voix des créations 3
    const track = await db.collection('tracks').findOne({ _id: trackId });
    
    if (track) {
      console.log('Track trouvée:');
      console.log('  _id:', track._id);
      console.log('  _id type:', typeof track._id);
      console.log('  _id constructor:', track._id.constructor.name);
      console.log('  title:', track.title);
      console.log('  artist:', track.artist);
      console.log('  artist type:', typeof track.artist);
      console.log('  artist constructor:', track.artist?.constructor?.name);
      
      // Vérifier si l'ID correspond
      console.log('\nComparaisons:');
      console.log('  track._id === trackId:', track._id === trackId);
      console.log('  track._id.toString() === trackId:', track._id.toString() === trackId);
      console.log('  track._id.toString() === trackId.toString():', track._id.toString() === trackId.toString());
      
      // Vérifier la recherche avec ObjectId
      const ObjectId = require('mongodb').ObjectId;
      const objectIdTrackId = new ObjectId(trackId);
      console.log('\nAvec ObjectId:');
      console.log('  objectIdTrackId:', objectIdTrackId);
      console.log('  track._id.equals(objectIdTrackId):', track._id.equals(objectIdTrackId));
      
      // Rechercher avec ObjectId
      const trackWithObjectId = await db.collection('tracks').findOne({ _id: objectIdTrackId });
      console.log('  Recherche avec ObjectId réussie:', !!trackWithObjectId);
      
      if (trackWithObjectId) {
        console.log('  artist trouvé avec ObjectId:', trackWithObjectId.artist);
        console.log('  artist type:', typeof trackWithObjectId.artist);
      }
    } else {
      console.log('❌ Track non trouvée avec string ID');
    }
    
    await mongoClient.close();
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Lancer le debug
if (require.main === module) {
  debugMongoDBTrack();
}
