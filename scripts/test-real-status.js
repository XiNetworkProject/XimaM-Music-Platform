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

async function testRealStatus() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer les utilisateurs existants
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}));
    const users = await User.find({}).limit(3).lean();
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé');
      return;
    }

    console.log(`👥 ${users.length} utilisateurs trouvés`);

    // Simuler différents scénarios de connexion
    console.log('\n🎭 Simulation de scénarios de connexion...\n');

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const now = new Date();
      
      // Scénario 1: Utilisateur en ligne
      if (i === 0) {
        console.log(`🟢 Simulation: ${user.name || user.username} se connecte...`);
        
        await UserStatus.findOneAndUpdate(
          { userId: user._id },
          {
            isOnline: true,
            lastSeen: now,
            lastActivity: now,
            isTyping: false,
            deviceInfo: {
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              platform: 'Win32',
              isMobile: false
            }
          },
          { upsert: true, new: true }
        );
        
        console.log(`✅ ${user.name || user.username} est maintenant en ligne`);
      }
      
      // Scénario 2: Utilisateur qui était en ligne il y a 2 minutes
      else if (i === 1) {
        console.log(`🟡 Simulation: ${user.name || user.username} était en ligne il y a 2 minutes...`);
        
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
        
        await UserStatus.findOneAndUpdate(
          { userId: user._id },
          {
            isOnline: false,
            lastSeen: twoMinutesAgo,
            lastActivity: twoMinutesAgo,
            isTyping: false,
            deviceInfo: {
              userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              platform: 'MacIntel',
              isMobile: false
            }
          },
          { upsert: true, new: true }
        );
        
        console.log(`✅ ${user.name || user.username} était en ligne il y a 2 minutes`);
      }
      
      // Scénario 3: Utilisateur hors ligne depuis longtemps
      else {
        console.log(`🔴 Simulation: ${user.name || user.username} est hors ligne depuis 1 heure...`);
        
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        await UserStatus.findOneAndUpdate(
          { userId: user._id },
          {
            isOnline: false,
            lastSeen: oneHourAgo,
            lastActivity: oneHourAgo,
            isTyping: false,
            deviceInfo: {
              userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
              platform: 'iPhone',
              isMobile: true
            }
          },
          { upsert: true, new: true }
        );
        
        console.log(`✅ ${user.name || user.username} est hors ligne depuis 1 heure`);
      }
    }

    // Afficher les statuts actuels
    console.log('\n📊 Statuts actuels dans la base de données:');
    const allStatuses = await UserStatus.find({}).populate('userId', 'name username').lean();
    
    allStatuses.forEach((status) => {
      const user = status.userId;
      const timeAgo = Math.floor((new Date().getTime() - new Date(status.lastActivity).getTime()) / 60000);
      const isActuallyOnline = status.isOnline && timeAgo < 5; // En ligne si activité < 5 min
      
      console.log(`\n👤 ${user?.name || user?.username || 'Utilisateur inconnu'}:`);
      console.log(`   Statut DB: ${status.isOnline ? 'En ligne' : 'Hors ligne'}`);
      console.log(`   Statut réel: ${isActuallyOnline ? 'En ligne' : 'Hors ligne'}`);
      console.log(`   Dernière activité: ${timeAgo} min`);
      console.log(`   Dernière vue: ${new Date(status.lastSeen).toLocaleString('fr-FR')}`);
      console.log(`   Plateforme: ${status.deviceInfo?.platform || 'Inconnue'}`);
      console.log(`   Mobile: ${status.deviceInfo?.isMobile ? 'Oui' : 'Non'}`);
    });

    console.log('\n🎯 Instructions de test:');
    console.log('1. Ouvrez une conversation avec un utilisateur');
    console.log('2. Vérifiez que les statuts correspondent aux scénarios ci-dessus');
    console.log('3. Les statuts se mettent à jour toutes les 10 secondes');
    console.log('4. Quand vous ouvrez une conversation, vous devriez apparaître "En ligne"');
    console.log('5. Quand vous fermez la conversation, vous devriez apparaître "Hors ligne"');

    // Surveillance en temps réel
    console.log('\n👀 Surveillance en temps réel (Ctrl+C pour arrêter):');
    let count = 0;
    const monitorInterval = setInterval(async () => {
      count++;
      const statuses = await UserStatus.find({}).populate('userId', 'name username').lean();
      
      console.log(`\n[${new Date().toLocaleTimeString('fr-FR')}] Vérification #${count}:`);
      statuses.forEach((status) => {
        const user = status.userId;
        const timeAgo = Math.floor((new Date().getTime() - new Date(status.lastActivity).getTime()) / 60000);
        const isActuallyOnline = status.isOnline && timeAgo < 5;
        
        const statusIcon = isActuallyOnline ? '🟢' : '🔴';
        console.log(`   ${statusIcon} ${user?.name || user?.username}: ${isActuallyOnline ? 'En ligne' : `Hors ligne (${timeAgo} min)`}`);
      });
    }, 10000);

    // Arrêter après 2 minutes
    setTimeout(() => {
      clearInterval(monitorInterval);
      console.log('\n⏰ Surveillance terminée');
      process.exit(0);
    }, 120000);

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testRealStatus(); 