import Stripe from 'stripe';

// Client Stripe côté serveur
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

// Loader Stripe côté client (publishable key)
export const getStripeJs = () => {
  if (typeof window !== 'undefined') {
    return require('@stripe/stripe-js').loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return null;
};

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

export const createStripeProduct = async (subscription: any) => {
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
    unit_amount: Math.round(subscription.price * 100),
    currency: subscription.currency.toLowerCase(),
    recurring: { interval: subscription.interval },
    metadata: { subscription_type: subscription.name },
  });
  return { product, price };
};

export const getStripePrices = async () => {
  const prices = await stripe.prices.list({ active: true, expand: ['data.product'] });
  return prices.data;
}; 