import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Retrouver/Créer le customer Stripe
    const list = await stripe.customers.list({ email: session.user.email, limit: 10 });
    const found = list.data.find(c => (c.metadata?.userId === session.user.id) || (c.email === session.user.email));
    const customerId = found ? found.id : (await stripe.customers.create({ email: session.user.email, metadata: { userId: session.user.id } })).id;

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { type: 'payment_update', userId: session.user.id },
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret, customerId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


