const { MongoClient } = require('mongodb');
const Stripe = require('stripe');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ximam';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY manquante dans les variables d\'environnement');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

async function setupStripe() {
  let client;
  
  try {
    console.log('🔧 Configuration Stripe pour XimaM...');
    
    // Connexion MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connecté à MongoDB');
    
    const db = client.db();
    const subscriptionsCollection = db.collection('subscriptions');
    
    // Récupérer tous les abonnements
    const subscriptions = await subscriptionsCollection.find({}).toArray();
    console.log(`📊 ${subscriptions.length} abonnements trouvés`);
    
    for (const subscription of subscriptions) {
      console.log(`\n🔄 Traitement de l'abonnement: ${subscription.name}`);
      
      // Vérifier si le produit Stripe existe déjà
      if (subscription.stripePriceId) {
        console.log(`  ✅ Prix Stripe déjà configuré: ${subscription.stripePriceId}`);
        continue;
      }
      
      try {
        // Créer le produit Stripe
        const product = await stripe.products.create({
          name: subscription.name.charAt(0).toUpperCase() + subscription.name.slice(1),
          description: `Plan ${subscription.name} - ${subscription.features.join(', ')}`,
          metadata: {
            subscription_type: subscription.name,
            features: JSON.stringify(subscription.features),
          },
        });
        console.log(`  ✅ Produit Stripe créé: ${product.id}`);
        
        // Créer le prix Stripe
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(subscription.price * 100), // Stripe utilise les centimes
          currency: subscription.currency.toLowerCase(),
          recurring: {
            interval: subscription.interval,
          },
          metadata: {
            subscription_type: subscription.name,
          },
        });
        console.log(`  ✅ Prix Stripe créé: ${price.id}`);
        
        // Mettre à jour l'abonnement avec l'ID du prix Stripe
        await subscriptionsCollection.updateOne(
          { _id: subscription._id },
          { $set: { stripePriceId: price.id } }
        );
        console.log(`  ✅ Abonnement mis à jour avec le prix Stripe`);
        
      } catch (error) {
        console.error(`  ❌ Erreur pour ${subscription.name}:`, error.message);
      }
    }
    
    console.log('\n🎉 Configuration Stripe terminée !');
    
    // Afficher un résumé
    const updatedSubscriptions = await subscriptionsCollection.find({}).toArray();
    console.log('\n📋 Résumé:');
    updatedSubscriptions.forEach(sub => {
      console.log(`  ${sub.name}: ${sub.stripePriceId ? '✅ Configuré' : '❌ Non configuré'}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration Stripe:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Déconnecté de MongoDB');
    }
  }
}

// Exécuter le script
setupStripe().catch(console.error); 