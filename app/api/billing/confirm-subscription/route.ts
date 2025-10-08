import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import type StripeType from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { customerId, priceId, defaultPaymentMethod, setupIntentId } = await req.json();
    if (!customerId || !priceId || !defaultPaymentMethod) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });

    // Attacher le moyen de paiement au customer si nécessaire, puis définir par défaut
    // Vérifier si le PM est déjà attaché, sinon attacher
    const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethod);
    const pmCustomer = (pm as any)?.customer as string | null | undefined;
    if (pmCustomer && pmCustomer !== customerId) {
      return NextResponse.json({ error: 'Payment method déjà attaché à un autre client', code: 'pm_wrong_customer' }, { status: 400 });
    }
    if (!pmCustomer) {
      await stripe.paymentMethods.attach(defaultPaymentMethod, { customer: customerId });
    }
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: defaultPaymentMethod } });

    // Créer la subscription avec essai de 3 jours (pour éviter proration 0€)
    const now = Math.floor(Date.now() / 1000);
    const trialEnd = now + (3 * 24 * 60 * 60); // 3 jours d'essai
    
    const subscriptionResp = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_end: trialEnd, // Essai de 3 jours, puis facturation du montant complet
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent']
    });
    const subscription = subscriptionResp as unknown as StripeType.Subscription;

    // Mettre à jour le profil immédiatement (sans attendre le webhook)
    const priceToPlan = () => {
      const env = process.env;
      // 1) Comparaison directe sur IDs (prix normaux + prix de lancement)
      if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH || 
          priceId === env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR ||
          priceId === env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH_LAUNCH || 
          priceId === env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR_LAUNCH) return 'starter';
      
      if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH || 
          priceId === env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR ||
          priceId === env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH_LAUNCH || 
          priceId === env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR_LAUNCH) return 'pro';
      
      if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTH || 
          priceId === env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEAR) return 'enterprise';
      
      // 2) Fallback par nom du produit / nickname Stripe
      const item = subscription.items?.data?.[0];
      const nick = (item?.price?.nickname || '').toLowerCase();
      const prodName = (typeof item?.price?.product === 'object' ? (item?.price?.product as any)?.name : '')?.toLowerCase() || '';
      const txt = `${nick} ${prodName}`;
      if (/(starter|basic)/.test(txt)) return 'starter';
      if (/(pro|professional)/.test(txt)) return 'pro';
      if (/(enterprise)/.test(txt)) return 'enterprise';
      // 3) Défaut: starter
      return 'starter';
    };

    const periodEndUnix = (subscription as any).current_period_end as number | undefined;
    const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
    // On a besoin de l'userId; on l'a dans la session côté API
    const { error: upErr } = await supabaseAdmin.from('profiles').update({
      plan: priceToPlan(),
      subscription_status: subscription.status,
      subscription_current_period_end: periodEnd,
    }).eq('id', session.user.id);
    if (upErr) {
      console.error('❌ MAJ profil plan échouée:', upErr);
    }

    return NextResponse.json({ subscription });
  } catch (e: any) {
    const err: any = e;
    return NextResponse.json({
      error: err?.message || 'Erreur',
      code: err?.raw?.code,
      stripeMessage: err?.raw?.message,
      type: err?.type
    }, { status: 500 });
  }
}


