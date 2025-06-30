const mongoose = require('mongoose');
require('dotenv').config();

async function checkApiData() {
  try {
    console.log('🔍 Vérification des données...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}));
    const users = await User.find({
      $or: [
        { avatar: { $regex: /placeholder/ } },
        { banner: { $regex: /placeholder/ } }
      ]
    }).select('username avatar banner');
    
    console.log(`👥 Utilisateurs avec placeholder: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.username}: avatar=${user.avatar}, banner=${user.banner}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkApiData(); 