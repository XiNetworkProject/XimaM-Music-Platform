import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });
    }

    // Récupérer la Checkout Session depuis Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Paiement non confirmé',
        paymentStatus: checkoutSession.payment_status 
      }, { status: 400 });
    }

    const subscription = checkoutSession.subscription as any;
    if (!subscription) {
      return NextResponse.json({ error: 'Abonnement non trouvé' }, { status: 404 });
    }

    // Déterminer le plan depuis le price ID
    const priceId = subscription.items?.data?.[0]?.price?.id;
    const priceToPlan = () => {
      const env = process.env;
      // Comparaison directe sur IDs (prix normaux + prix de lancement)
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
      
      // Fallback par nom du produit / nickname Stripe
      const item = subscription.items?.data?.[0];
      const nick = (item?.price?.nickname || '').toLowerCase();
      const prodName = (typeof item?.price?.product === 'object' ? (item?.price?.product as any)?.name : '')?.toLowerCase() || '';
      const txt = `${nick} ${prodName}`;
      if (/(starter|basic)/.test(txt)) return 'starter';
      if (/(pro|professional)/.test(txt)) return 'pro';
      if (/(enterprise)/.test(txt)) return 'enterprise';
      
      return 'starter';
    };

    const periodEndUnix = subscription.current_period_end as number | undefined;
    const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

    // Mettre à jour le profil avec le nouveau plan
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: priceToPlan(),
        subscription_status: subscription.status,
        subscription_current_period_end: periodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour profil:', updateError);
      return NextResponse.json({ 
        error: 'Erreur lors de la mise à jour du profil',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ Abonnement activé pour:', session.user.email, '- Plan:', priceToPlan());

    return NextResponse.json({ 
      success: true,
      plan: priceToPlan(),
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: periodEnd
      }
    });

  } catch (e: any) {
    console.error('❌ Erreur verify-checkout:', e);
    return NextResponse.json({ 
      error: e.message || 'Erreur interne',
      type: e.type 
    }, { status: 500 });
  }
}

