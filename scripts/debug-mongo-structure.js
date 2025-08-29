const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugMongoStructure() {
  console.log('🔍 Diagnostic de la structure MongoDB...');
  
  try {
    const mongoClient = await MongoClient.connect(process.env.MONGODB_URI);
    const db = mongoClient.db();
    
    // Analyser la structure des tracks
    console.log('\n📊 Structure des Tracks :');
    const tracks = await db.collection('tracks').find({}).limit(3).toArray();
    tracks.forEach((track, index) => {
      console.log(`\nTrack ${index + 1}:`);
      console.log('  _id:', track._id);
      console.log('  title:', track.title);
      console.log('  duration:', track.duration, 'Type:', typeof track.duration);
      console.log('  genre:', track.genre, 'Type:', typeof track.genre);
      console.log('  plays:', track.plays, 'Type:', typeof track.plays);
      console.log('  likes:', track.likes, 'Type:', typeof track.likes);
    });
    
    // Analyser la structure des commentaires
    console.log('\n📊 Structure des Commentaires :');
    const comments = await db.collection('comments').find({}).limit(3).toArray();
    comments.forEach((comment, index) => {
      console.log(`\nComment ${index + 1}:`);
      console.log('  _id:', comment._id);
      console.log('  content:', comment.content);
      console.log('  trackId:', comment.trackId, 'Type:', typeof comment.trackId);
      console.log('  parentId:', comment.parentId, 'Type:', typeof comment.parentId);
      console.log('  likes:', comment.likes, 'Type:', typeof comment.likes);
      console.log('  Tous les champs:', Object.keys(comment));
    });
    
    // Analyser la structure des playlists
    console.log('\n📊 Structure des Playlists :');
    const playlists = await db.collection('playlists').find({}).limit(3).toArray();
    playlists.forEach((playlist, index) => {
      console.log(`\nPlaylist ${index + 1}:`);
      console.log('  _id:', playlist._id);
      console.log('  name:', playlist.name);
      console.log('  Tous les champs:', Object.keys(playlist));
    });
    
    await mongoClient.close();
    
  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
  }
}

debugMongoStructure();
