const mongoose = require('mongoose');
require('dotenv').config();

// Modèle UserStatus simplifié pour le test
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

async function testOnlineStatus() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Nettoyer les anciens statuts
    console.log('🧹 Nettoyage des anciens statuts...');
    await UserStatus.deleteMany({});
    console.log('✅ Anciens statuts supprimés');

    // Créer des statuts de test
    console.log('👥 Création de statuts de test...');
    
    const testUsers = [
      {
        userId: new mongoose.Types.ObjectId(),
        isOnline: true,
        lastSeen: new Date(),
        isTyping: false,
        lastActivity: new Date(),
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          platform: 'Win32',
          isMobile: false
        }
      },
      {
        userId: new mongoose.Types.ObjectId(),
        isOnline: false,
        lastSeen: new Date(Date.now() - 10 * 60 * 1000), // Hors ligne depuis 10 min
        isTyping: false,
        lastActivity: new Date(Date.now() - 10 * 60 * 1000),
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          platform: 'iPhone',
          isMobile: true
        }
      },
      {
        userId: new mongoose.Types.ObjectId(),
        isOnline: true,
        lastSeen: new Date(),
        isTyping: true,
        lastActivity: new Date(),
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          platform: 'MacIntel',
          isMobile: false
        }
      }
    ];

    await UserStatus.insertMany(testUsers);
    console.log('✅ Statuts de test créés');

    // Afficher les statuts
    console.log('\n📊 Statuts actuels:');
    const allStatuses = await UserStatus.find({}).lean();
    allStatuses.forEach((status, index) => {
      console.log(`\n👤 Utilisateur ${index + 1}:`);
      console.log(`   ID: ${status.userId}`);
      console.log(`   En ligne: ${status.isOnline ? '✅' : '❌'}`);
      console.log(`   Dernière activité: ${status.lastActivity.toLocaleString('fr-FR')}`);
      console.log(`   En train de taper: ${status.isTyping ? '✅' : '❌'}`);
      console.log(`   Plateforme: ${status.deviceInfo?.platform || 'Inconnue'}`);
      console.log(`   Mobile: ${status.deviceInfo?.isMobile ? '✅' : '❌'}`);
    });

    // Test de récupération d'un statut spécifique
    if (allStatuses.length > 0) {
      const testUserId = allStatuses[0].userId;
      console.log(`\n🔍 Test récupération statut pour ${testUserId}:`);
      
      const userStatus = await UserStatus.findOne({ userId: testUserId }).lean();
      if (userStatus) {
        console.log('✅ Statut trouvé:', {
          isOnline: userStatus.isOnline,
          lastSeen: userStatus.lastSeen.toLocaleString('fr-FR'),
          isTyping: userStatus.isTyping
        });
      } else {
        console.log('❌ Statut non trouvé');
      }
    }

    // Test de mise à jour
    if (allStatuses.length > 0) {
      const testUserId = allStatuses[0].userId;
      console.log(`\n🔄 Test mise à jour statut pour ${testUserId}:`);
      
      await UserStatus.findOneAndUpdate(
        { userId: testUserId },
        { 
          isOnline: false,
          lastActivity: new Date(),
          isTyping: false
        }
      );
      
      const updatedStatus = await UserStatus.findOne({ userId: testUserId }).lean();
      console.log('✅ Statut mis à jour:', {
        isOnline: updatedStatus.isOnline,
        lastActivity: updatedStatus.lastActivity.toLocaleString('fr-FR'),
        isTyping: updatedStatus.isTyping
      });
    }

    console.log('\n🎉 Tests terminés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter les tests
testOnlineStatus(); 