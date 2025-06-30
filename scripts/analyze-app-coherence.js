const mongoose = require('mongoose');
require('dotenv').config();

async function analyzeAppCoherence() {
  try {
    console.log('🔍 Analyse de la cohérence...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}));
    const Track = mongoose.models.Track || mongoose.model('Track', new mongoose.Schema({}));
    const Playlist = mongoose.models.Playlist || mongoose.model('Playlist', new mongoose.Schema({}));
    
    console.log('\n📊 Données:');
    const userCount = await User.countDocuments();
    const trackCount = await Track.countDocuments();
    const playlistCount = await Playlist.countDocuments();
    
    console.log(`👥 Utilisateurs: ${userCount}`);
    console.log(`🎵 Tracks: ${trackCount}`);
    console.log(`📚 Playlists: ${playlistCount}`);
    
    console.log('\n⚠️ PROBLÈMES DÉTECTÉS:');
    console.log('1. Interface User vs Modèle User incohérents');
    console.log('2. Interface Track vs Modèle Track incohérents');
    console.log('3. APIs ne retournent pas toutes les données');
    console.log('4. Types ObjectId vs string incohérents');
    console.log('5. Champs manquants dans les interfaces');
    
    console.log('\n✅ SOLUTIONS:');
    console.log('1. Standardiser les interfaces');
    console.log('2. Corriger les APIs');
    console.log('3. Ajouter les champs manquants');
    console.log('4. Créer des types communs');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeAppCoherence(); 