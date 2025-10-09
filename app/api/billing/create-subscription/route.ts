import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { priceId, promotionCode, couponId } = await req.json();
    if (!priceId) return NextResponse.json({ error: 'priceId requis' }, { status: 400 });

    // Rechercher un customer existant par email/metadata pour éviter les doublons
    let customerId = (session.user as any).stripeCustomerId as string | undefined;
    if (!customerId) {
      const list = await stripe.customers.list({ email: session.user.email as string, limit: 10 });
      const found = list.data.find(c => (c.metadata?.userId === session.user.id) || (c.email === session.user.email));
      if (found) {
        customerId = found.id;
      } else {
        const customer = await stripe.customers.create({
          email: session.user.email,
          metadata: { userId: session.user.id }
        });
        customerId = customer.id;
      }
    }

    // Construire les remises si un code promo/coupon est fourni
    let discounts: { promotion_code?: string; coupon?: string }[] | undefined;
    if (promotionCode) {
      // Rechercher un Promotion Code actif correspondant au code fourni
      const list = await stripe.promotionCodes.list({ code: promotionCode, active: true, limit: 1 });
      const promo = list.data?.[0];
      if (promo?.id) {
        discounts = [{ promotion_code: promo.id }];
      }
    } else if (couponId) {
      // Support direct d'un coupon Stripe si l'ID est fourni
      try {
        const coupon = await stripe.coupons.retrieve(couponId);
        if (coupon?.id && coupon.valid !== false) {
          discounts = [{ coupon: coupon.id }];
        }
      } catch {}
    }

    // Créer une Checkout Session pour forcer le paiement immédiat du montant complet
    const sessionParams: any = {
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/subscriptions?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/subscriptions`,
      subscription_data: {
        metadata: {
          userId: session.user.id,
        },
      },
      billing_address_collection: 'auto',
    };
    // Stripe n'autorise pas allow_promotion_codes et discounts ensemble
    if (discounts && discounts.length > 0) {
      sessionParams.discounts = discounts;
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ 
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      customerId 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


