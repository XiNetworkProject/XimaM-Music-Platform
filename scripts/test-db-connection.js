const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔌 Test MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion réussie');
    
    const Track = mongoose.models.Track || mongoose.model('Track', new mongoose.Schema({}));
    const count = await Track.countDocuments();
    console.log(`📊 Tracks: ${count}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection(); 