const mongoose = require('mongoose');
require('dotenv').config();

// Modèles
const UserSubscription = require('./models/UserSubscription');
const Subscription = require('./models/Subscription');

async function fixUserSubscription() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const userEmail = 'vermeulenmaxime59@gmail.com';
    const userId = '685cf30c4de183bc3cced8fd'; // Votre ID utilisateur

    console.log('🔍 Recherche de l\'abonnement utilisateur...');
    
    // Vérifier l'abonnement existant
    const existingSubscription = await UserSubscription.findOne({ user: userId });
    console.log('📊 Abonnement existant:', existingSubscription);

    // Récupérer le plan Enterprise
    const enterprisePlan = await Subscription.findOne({ name: 'enterprise' });
    console.log('📦 Plan Enterprise:', enterprisePlan);

    if (!enterprisePlan) {
      console.log('❌ Plan Enterprise non trouvé');
      return;
    }

    if (existingSubscription) {
      console.log('🔄 Mise à jour de l\'abonnement existant...');
      
      // Mettre à jour l'abonnement existant
      const updated = await UserSubscription.findByIdAndUpdate(
        existingSubscription._id,
        {
          subscription: enterprisePlan._id,
          status: 'trial',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
          trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
          usage: {
            uploads: 0,
            comments: 0,
            plays: 0,
            playlists: 0,
          },
          stripeSubscriptionId: 'sub_enterprise_manual', // Placeholder
        },
        { new: true }
      );
      
      console.log('✅ Abonnement mis à jour:', updated);
    } else {
      console.log('🆕 Création d\'un nouvel abonnement...');
      
      // Créer un nouvel abonnement
      const newSubscription = new UserSubscription({
        user: userId,
        subscription: enterprisePlan._id,
        status: 'trial',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
        usage: {
          uploads: 0,
          comments: 0,
          plays: 0,
          playlists: 0,
        },
        stripeSubscriptionId: 'sub_enterprise_manual', // Placeholder
      });
      
      const saved = await newSubscription.save();
      console.log('✅ Nouvel abonnement créé:', saved);
    }

    // Vérifier le résultat
    const finalSubscription = await UserSubscription.findOne({ user: userId }).populate('subscription');
    console.log('🎯 Abonnement final:', finalSubscription);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

fixUserSubscription(); 