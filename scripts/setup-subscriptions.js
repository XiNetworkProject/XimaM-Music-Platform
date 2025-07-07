const mongoose = require('mongoose');
require('dotenv').config();

// Modèle Subscription
const SubscriptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['free', 'starter', 'creator', 'pro', 'enterprise']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  interval: {
    type: String,
    default: 'month',
    enum: ['month', 'year']
  },
  limits: {
    uploads: {
      type: Number,
      required: true,
      default: 3
    },
    comments: {
      type: Number,
      required: true,
      default: 10
    },
    plays: {
      type: Number,
      required: true,
      default: 50
    },
    playlists: {
      type: Number,
      required: true,
      default: 2
    },
    quality: {
      type: String,
      default: '128kbps',
      enum: ['128kbps', '256kbps', '320kbps', 'lossless', 'master']
    },
    ads: {
      type: Boolean,
      default: true
    },
    analytics: {
      type: String,
      default: 'none',
      enum: ['none', 'basic', 'advanced', 'complete']
    },
    collaborations: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    support: {
      type: String,
      default: 'community',
      enum: ['community', 'email', 'priority', 'dedicated']
    }
  },
  features: [{
    type: String
  }],
  stripePriceId: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// Modèle UserSubscription
const UserSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'expired', 'trial'],
    default: 'trial'
  },
  currentPeriodStart: {
    type: Date,
    required: true,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  usage: {
    uploads: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    plays: {
      type: Number,
      default: 0
    },
    playlists: {
      type: Number,
      default: 0
    }
  },
  stripeSubscriptionId: {
    type: String
  },
  stripeCustomerId: {
    type: String
  }
}, {
  timestamps: true
});

const UserSubscription = mongoose.model('UserSubscription', UserSubscriptionSchema);

async function setupSubscriptions() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Supprimer les abonnements existants
    console.log('🗑️ Suppression des abonnements existants...');
    await Subscription.deleteMany({});
    console.log('✅ Abonnements supprimés');

    // Créer les abonnements par défaut
    const subscriptions = [
      {
        name: 'free',
        price: 0,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: 3,
          comments: 10,
          plays: 50,
          playlists: 2,
          quality: '128kbps',
          ads: true,
          analytics: 'none',
          collaborations: false,
          apiAccess: false,
          support: 'community'
        },
        features: [
          '3 uploads par mois',
          '10 commentaires par mois',
          '50 écoutes par mois',
          '2 playlists max',
          'Qualité audio 128kbps',
          'Publicités incluses',
          'Support communautaire'
        ]
      },
      {
        name: 'starter',
        price: 4.99,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: 15,
          comments: 200,
          plays: 500,
          playlists: 10,
          quality: '256kbps',
          ads: false,
          analytics: 'basic',
          collaborations: false,
          apiAccess: false,
          support: 'email'
        },
        features: [
          '15 uploads par mois',
          '200 commentaires par mois',
          '500 écoutes par mois',
          '10 playlists max',
          'Qualité audio 256kbps',
          'Sans publicités',
          'Analytics basiques',
          'Support par email'
        ]
      },
      {
        name: 'creator',
        price: 12.99,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: 50,
          comments: 1000,
          plays: 2000,
          playlists: -1, // Illimité
          quality: '320kbps',
          ads: false,
          analytics: 'advanced',
          collaborations: true,
          apiAccess: false,
          support: 'priority'
        },
        features: [
          '50 uploads par mois',
          '1000 commentaires par mois',
          '2000 écoutes par mois',
          'Playlists illimitées',
          'Qualité audio 320kbps',
          'Sans publicités',
          'Analytics avancés',
          'Collaborations',
          'Support prioritaire'
        ]
      },
      {
        name: 'pro',
        price: 19.99,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: 150,
          comments: -1, // Illimité
          plays: 5000,
          playlists: -1, // Illimité
          quality: 'lossless',
          ads: false,
          analytics: 'complete',
          collaborations: true,
          apiAccess: false,
          support: 'dedicated'
        },
        features: [
          '150 uploads par mois',
          'Commentaires illimités',
          '5000 écoutes par mois',
          'Playlists illimitées',
          'Qualité audio Lossless',
          'Sans publicités',
          'Analytics complets',
          'Collaborations avancées',
          'Support dédié'
        ]
      },
      {
        name: 'enterprise',
        price: 29.99,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: -1, // Illimité
          comments: -1, // Illimité
          plays: -1, // Illimité
          playlists: -1, // Illimité
          quality: 'master',
          ads: false,
          analytics: 'complete',
          collaborations: true,
          apiAccess: true,
          support: 'dedicated'
        },
        features: [
          'Uploads illimités',
          'Commentaires illimités',
          'Écoutes illimitées',
          'Playlists illimitées',
          'Qualité audio Master',
          'Sans publicités',
          'Analytics complets',
          'Collaborations avancées',
          'Accès API',
          'Support dédié 24/7'
        ]
      }
    ];

    console.log('📝 Création des abonnements...');
    for (const subData of subscriptions) {
      const subscription = new Subscription(subData);
      await subscription.save();
      console.log(`✅ Abonnement ${subData.name} créé`);
    }

    console.log('🎉 Configuration des abonnements terminée !');
    console.log('\n📊 Abonnements créés :');
    
    const createdSubs = await Subscription.find({}).sort({ price: 1 });
    createdSubs.forEach(sub => {
      console.log(`- ${sub.name}: ${sub.price}€/mois`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

setupSubscriptions(); 