const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllApis() {
  try {
    console.log('🔍 Vérification des APIs...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Vérifier les modèles
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}));
    const Track = mongoose.models.Track || mongoose.model('Track', new mongoose.Schema({}));
    const Playlist = mongoose.models.Playlist || mongoose.model('Playlist', new mongoose.Schema({}));
    
    console.log('\n📊 Vérification des données...');
    
    // Vérifier les utilisateurs
    const users = await User.find().limit(1).lean();
    console.log(`👥 Utilisateurs: ${users.length}`);
    if (users.length > 0) {
      const user = users[0];
      console.log(`  - ID type: ${typeof user._id}`);
      console.log(`  - ID value: ${user._id}`);
    }
    
    // Vérifier les tracks
    const tracks = await Track.find().limit(1).populate('artist').lean();
    console.log(`🎵 Tracks: ${tracks.length}`);
    if (tracks.length > 0) {
      const track = tracks[0];
      console.log(`  - Track ID type: ${typeof track._id}`);
      console.log(`  - Artist ID type: ${typeof track.artist?._id}`);
    }
    
    // Vérifier les playlists
    const playlists = await Playlist.find().limit(1).populate('createdBy').lean();
    console.log(`📚 Playlists: ${playlists.length}`);
    if (playlists.length > 0) {
      const playlist = playlists[0];
      console.log(`  - Playlist ID type: ${typeof playlist._id}`);
      console.log(`  - CreatedBy ID type: ${typeof playlist.createdBy?._id}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllApis(); 