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

    const { priceId } = await req.json();
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

    // Intent pour Payment Element intégré (mode subscription)
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { type: 'subscription_setup', userId: session.user.id },
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret, customerId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


