const mongoose = require('mongoose');
require('dotenv').config();

// Modèles
const UserSubscription = require('../models/UserSubscription').default;
const User = require('../models/User').default;

async function debugSubscriptionStatus() {
  try {
    console.log('🔍 Début du debug des abonnements...');
    
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion à MongoDB établie');
    
    // Récupérer tous les abonnements
    const allSubscriptions = await UserSubscription.find({}).populate('user', 'email name');
    
    console.log(`📊 ${allSubscriptions.length} abonnements trouvés dans la base`);
    
    for (const sub of allSubscriptions) {
      console.log('\n📋 Abonnement:', sub._id);
      console.log(`   - Utilisateur: ${sub.user?.email || 'N/A'}`);
      console.log(`   - Statut actuel: ${sub.status}`);
      console.log(`   - Stripe Subscription ID: ${sub.stripeSubscriptionId || 'N/A'}`);
      console.log(`   - Current Period End: ${sub.currentPeriodEnd}`);
      console.log(`   - Trial End: ${sub.trialEnd || 'N/A'}`);
      
      // Vérifier si l'abonnement est expiré
      const now = new Date();
      const isExpired = sub.currentPeriodEnd && sub.currentPeriodEnd < now;
      const isTrialExpired = sub.trialEnd && sub.trialEnd < now;
      
      console.log(`   - Expiré selon date: ${isExpired}`);
      console.log(`   - Essai expiré: ${isTrialExpired}`);
      
      // Suggestions de correction
      if (sub.status === 'trial' && isTrialExpired) {
        console.log('   ⚠️  SUGGESTION: Marquer comme expiré');
      } else if (sub.status === 'active' && isExpired) {
        console.log('   ⚠️  SUGGESTION: Marquer comme expiré');
      } else if (sub.status === 'trialing') {
        console.log('   ⚠️  SUGGESTION: Changer en "trial"');
      }
    }
    
    // Demander à l'utilisateur s'il veut corriger
    console.log('\n🔧 Veux-tu corriger les statuts ? (y/n)');
    
  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion à MongoDB fermée');
  }
}

// Exécuter le script
debugSubscriptionStatus(); 