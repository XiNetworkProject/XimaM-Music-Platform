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
    const now = new Date();
    
    // Abonnements actifs expirés
    const expiredActiveSubscriptions = await UserSubscription.find({
      status: 'active',
      currentPeriodEnd: { $lt: now }
    });
    
    // Essais gratuits expirés
    const expiredTrialSubscriptions = await UserSubscription.find({
      status: 'trial',
      trialEnd: { $lt: now }
    });
    
    const expiredSubscriptions = [...expiredActiveSubscriptions, ...expiredTrialSubscriptions];
    
    console.log(`📊 ${expiredSubscriptions.length} abonnements expirés trouvés`);
    console.log(`   - ${expiredActiveSubscriptions.length} abonnements actifs expirés`);
    console.log(`   - ${expiredTrialSubscriptions.length} essais gratuits expirés`);
    
    if (expiredSubscriptions.length === 0) {
      console.log('✅ Aucun abonnement expiré à corriger');
      return;
    }
    
    // Mettre à jour le statut de tous les abonnements actifs expirés
    const updateActiveResult = await UserSubscription.updateMany(
      {
        status: 'active',
        currentPeriodEnd: { $lt: now }
      },
      {
        $set: { status: 'expired' }
      }
    );
    
    // Mettre à jour le statut de tous les essais gratuits expirés
    const updateTrialResult = await UserSubscription.updateMany(
      {
        status: 'trial',
        trialEnd: { $lt: now }
      },
      {
        $set: { status: 'expired' }
      }
    );
    
    console.log(`✅ ${updateActiveResult.modifiedCount} abonnements actifs mis à jour avec le statut 'expired'`);
    console.log(`✅ ${updateTrialResult.modifiedCount} essais gratuits mis à jour avec le statut 'expired'`);
    
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