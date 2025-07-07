const mongoose = require('mongoose');
require('dotenv').config();

// Modèles
const UserSubscription = require('../models/UserSubscription');

async function fixExpiredSubscriptions() {
  try {
    console.log('🔧 Début du nettoyage des abonnements expirés...');
    
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion à MongoDB établie');
    
    // Trouver tous les abonnements avec statut 'active' ou 'trial' mais expirés
    const expiredSubscriptions = await UserSubscription.find({
      status: { $in: ['active', 'trial'] },
      currentPeriodEnd: { $lt: new Date() }
    });
    
    console.log(`📊 ${expiredSubscriptions.length} abonnements expirés trouvés`);
    
    if (expiredSubscriptions.length === 0) {
      console.log('✅ Aucun abonnement expiré à corriger');
      return;
    }
    
    // Mettre à jour le statut de tous les abonnements expirés
    const updateResult = await UserSubscription.updateMany(
      {
        status: { $in: ['active', 'trial'] },
        currentPeriodEnd: { $lt: new Date() }
      },
      {
        $set: { status: 'expired' }
      }
    );
    
    console.log(`✅ ${updateResult.modifiedCount} abonnements mis à jour avec le statut 'expired'`);
    
    // Afficher les détails des abonnements corrigés
    for (const sub of expiredSubscriptions) {
      console.log(`📋 Abonnement ${sub._id}:`);
      console.log(`   - Utilisateur: ${sub.user}`);
      console.log(`   - Ancien statut: ${sub.status}`);
      console.log(`   - Date d'expiration: ${sub.currentPeriodEnd}`);
      console.log(`   - Nouveau statut: expired`);
      console.log('');
    }
    
    console.log('🎉 Nettoyage terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion à MongoDB fermée');
  }
}

// Exécuter le script
fixExpiredSubscriptions(); 