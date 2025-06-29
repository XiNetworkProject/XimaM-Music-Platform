const mongoose = require('mongoose');
require('dotenv').config();

// Modèle User simplifié
const userSchema = new mongoose.Schema({
  avatar: String,
  banner: String
});

const User = mongoose.model('User', userSchema);

async function fixImageUrls() {
  try {
    console.log('Connexion à la base de données...');
    console.log('URI MongoDB:', process.env.MONGODB_URI ? 'Définie' : 'Non définie');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI non définie dans les variables d\'environnement');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Trouver tous les utilisateurs avec des URLs localhost (plusieurs patterns)
    const users = await User.find({
      $or: [
        { avatar: { $regex: /localhost:3000/ } },
        { banner: { $regex: /localhost:3000/ } },
        { avatar: { $regex: /http:\/\/localhost:3000/ } },
        { banner: { $regex: /http:\/\/localhost:3000/ } },
        { avatar: { $regex: /https:\/\/localhost:3000/ } },
        { banner: { $regex: /https:\/\/localhost:3000/ } }
      ]
    });

    console.log(`Trouvé ${users.length} utilisateurs avec des URLs localhost`);

    let updatedCount = 0;

    for (const user of users) {
      let updated = false;

      // Nettoyer l'avatar
      if (user.avatar && user.avatar.includes('localhost:3000')) {
        const oldAvatar = user.avatar;
        user.avatar = user.avatar.replace(/^https?:\/\/localhost:3000/, '');
        // Si l'URL devient vide, utiliser l'image par défaut
        if (!user.avatar) {
          user.avatar = '/default-avatar.png';
        }
        updated = true;
        console.log(`Avatar nettoyé pour ${user._id}: ${oldAvatar} → ${user.avatar}`);
      }

      // Nettoyer la bannière
      if (user.banner && user.banner.includes('localhost:3000')) {
        const oldBanner = user.banner;
        user.banner = user.banner.replace(/^https?:\/\/localhost:3000/, '');
        // Si l'URL devient vide, utiliser l'image par défaut
        if (!user.banner) {
          user.banner = '/default-cover.jpg';
        }
        updated = true;
        console.log(`Bannière nettoyée pour ${user._id}: ${oldBanner} → ${user.banner}`);
      }

      if (updated) {
        await user.save();
        updatedCount++;
      }
    }

    console.log(`✅ ${updatedCount} utilisateurs mis à jour avec succès`);

    // Afficher un résumé des utilisateurs restants
    const remainingUsers = await User.find({
      $or: [
        { avatar: { $regex: /localhost:3000/ } },
        { banner: { $regex: /localhost:3000/ } }
      ]
    });

    if (remainingUsers.length > 0) {
      console.log(`⚠️  ${remainingUsers.length} utilisateurs ont encore des URLs localhost:`);
      remainingUsers.forEach(user => {
        console.log(`  - ${user._id}: avatar=${user.avatar}, banner=${user.banner}`);
      });
    } else {
      console.log('🎉 Toutes les URLs localhost ont été nettoyées !');
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

// Exécuter le script
fixImageUrls(); 