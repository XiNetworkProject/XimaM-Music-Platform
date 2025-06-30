const mongoose = require('mongoose');
require('dotenv').config();

// Modèle User simplifié pour le script
const UserSchema = new mongoose.Schema({
  avatar: String,
  banner: String,
  // autres champs...
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function fixPlaceholderUrls() {
  try {
    console.log('🔧 Nettoyage des URLs placeholder...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const usersWithPlaceholders = await User.find({
      $or: [
        { avatar: { $regex: /via\.placeholder\.com/ } },
        { banner: { $regex: /via\.placeholder\.com/ } }
      ]
    });

    console.log(`📊 ${usersWithPlaceholders.length} utilisateurs avec URLs placeholder`);

    for (const user of usersWithPlaceholders) {
      const updates = {};
      
      if (user.avatar && user.avatar.includes('via.placeholder.com')) {
        updates.avatar = '/default-avatar.svg';
      }
      
      if (user.banner && user.banner.includes('via.placeholder.com')) {
        updates.banner = '/default-banner.svg';
      }
      
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(user._id, updates);
        console.log(`✅ ${user.username} mis à jour`);
      }
    }

    console.log('🎉 Nettoyage terminé !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Exécuter le script
fixPlaceholderUrls(); 