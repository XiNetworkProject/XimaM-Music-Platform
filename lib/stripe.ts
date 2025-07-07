import Stripe from 'stripe';

// Configuration Stripe côté serveur
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});

// Configuration Stripe côté client
export const getStripe = () => {
  if (typeof window !== 'undefined') {
    return require('@stripe/stripe-js').loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return null;
};

// Types pour les produits Stripe
export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
  metadata: {
    subscription_type: string;
    features: string;
  };
}

export interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  recurring: {
    interval: 'month' | 'year';
  };
  metadata: {
    subscription_type: string;
  };
}

// Fonction pour créer un produit Stripe
export const createStripeProduct = async (subscription: any) => {
  try {
    const product = await stripe.products.create({
      name: subscription.name.charAt(0).toUpperCase() + subscription.name.slice(1),
      description: `Plan ${subscription.name} - ${subscription.features.join(', ')}`,
      metadata: {
        subscription_type: subscription.name,
        features: JSON.stringify(subscription.features),
      },
    });

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

    return { product, price };
  } catch (error) {
    console.error('Erreur création produit Stripe:', error);
    throw error;
  }
};

// Fonction pour récupérer les prix Stripe
export const getStripePrices = async () => {
  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });
    return prices.data;
  } catch (error) {
    console.error('Erreur récupération prix Stripe:', error);
    throw error;
  }
}; 