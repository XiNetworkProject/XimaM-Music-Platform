const mongoose = require('mongoose');
require('dotenv').config();

// Modèle UserStatus
const UserStatusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  isTyping: {
    type: Boolean,
    default: false,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    isMobile: Boolean,
  },
}, {
  timestamps: true,
});

const UserStatus = mongoose.models.UserStatus || mongoose.model('UserStatus', UserStatusSchema);

async function initOnlineStatus() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer quelques utilisateurs existants
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}));
    const users = await User.find({}).limit(5).lean();
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base de données');
      return;
    }

    console.log(`👥 ${users.length} utilisateurs trouvés`);

    // Créer des statuts variés pour tester
    const statuses = users.map((user, index) => {
      const now = new Date();
      let lastActivity, isOnline, lastSeen;

      // Créer différents scénarios de test
      switch (index) {
        case 0: // En ligne maintenant
          isOnline = true;
          lastActivity = now;
          lastSeen = now;
          break;
        case 1: // Hors ligne depuis 2 minutes
          isOnline = false;
          lastActivity = new Date(now.getTime() - 2 * 60 * 1000);
          lastSeen = new Date(now.getTime() - 2 * 60 * 1000);
          break;
        case 2: // Hors ligne depuis 15 minutes
          isOnline = false;
          lastActivity = new Date(now.getTime() - 15 * 60 * 1000);
          lastSeen = new Date(now.getTime() - 15 * 60 * 1000);
          break;
        case 3: // En ligne mais inactif depuis 1 minute
          isOnline = true;
          lastActivity = new Date(now.getTime() - 1 * 60 * 1000);
          lastSeen = now;
          break;
        default: // Hors ligne depuis 1 heure
          isOnline = false;
          lastActivity = new Date(now.getTime() - 60 * 60 * 1000);
          lastSeen = new Date(now.getTime() - 60 * 60 * 1000);
      }

      return {
        userId: user._id,
        isOnline,
        lastSeen,
        isTyping: false,
        lastActivity,
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          platform: index % 2 === 0 ? 'Win32' : 'MacIntel',
          isMobile: index % 3 === 0
        }
      };
    });

    // Supprimer les anciens statuts
    console.log('🧹 Suppression des anciens statuts...');
    await UserStatus.deleteMany({});
    console.log('✅ Anciens statuts supprimés');

    // Insérer les nouveaux statuts
    console.log('📝 Insertion des nouveaux statuts...');
    await UserStatus.insertMany(statuses);
    console.log('✅ Nouveaux statuts insérés');

    // Afficher les statuts créés
    console.log('\n📊 Statuts créés:');
    const allStatuses = await UserStatus.find({}).populate('userId', 'name username').lean();
    allStatuses.forEach((status, index) => {
      const user = status.userId;
      const timeAgo = Math.floor((new Date().getTime() - new Date(status.lastActivity).getTime()) / 60000);
      
      console.log(`\n👤 ${user?.name || user?.username || 'Utilisateur inconnu'}:`);
      console.log(`   En ligne: ${status.isOnline ? '✅' : '❌'}`);
      console.log(`   Dernière activité: ${timeAgo} min`);
      console.log(`   Dernière vue: ${new Date(status.lastSeen).toLocaleString('fr-FR')}`);
      console.log(`   Plateforme: ${status.deviceInfo?.platform || 'Inconnue'}`);
      console.log(`   Mobile: ${status.deviceInfo?.isMobile ? '✅' : '❌'}`);
    });

    console.log('\n🎉 Initialisation terminée !');
    console.log('\n💡 Pour tester:');
    console.log('1. Ouvrez une conversation avec un utilisateur');
    console.log('2. Vérifiez que les statuts correspondent aux données créées');
    console.log('3. Les statuts se mettront à jour automatiquement toutes les 10 secondes');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter l'initialisation
initOnlineStatus(); 