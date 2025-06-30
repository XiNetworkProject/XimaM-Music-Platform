const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
  username: String,
  name: String,
  email: String,
  avatar: String,
  banner: String,
  bio: String,
  location: String,
  website: String,
  socialLinks: {
    twitter: String,
    instagram: String,
    youtube: String,
    spotify: String
  },
  followers: [String],
  following: [String],
  isVerified: Boolean
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function fixUserData() {
  try {
    console.log('🔧 Vérification des données utilisateur...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const users = await User.find({});
    console.log(`📊 ${users.length} utilisateurs trouvés`);
    
    let fixedCount = 0;
    
    for (const user of users) {
      const updates = {};
      let needsUpdate = false;
      
      // S'assurer que les champs requis existent
      if (!user.followers) {
        updates.followers = [];
        needsUpdate = true;
      }
      
      if (!user.following) {
        updates.following = [];
        needsUpdate = true;
      }
      
      if (!user.socialLinks) {
        updates.socialLinks = {
          twitter: '',
          instagram: '',
          youtube: '',
          spotify: ''
        };
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await User.findByIdAndUpdate(user._id, updates);
        fixedCount++;
        console.log(`✅ Utilisateur ${user.username} corrigé`);
      }
    }
    
    console.log(`🎉 ${fixedCount} utilisateurs corrigés`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixUserData(); 