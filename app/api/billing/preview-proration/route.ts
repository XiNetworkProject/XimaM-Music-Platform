import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { priceId } = await req.json();
    if (!priceId) return NextResponse.json({ error: 'priceId requis' }, { status: 400 });

    // Retrouver customer et subscription actuelle
    const customers = await stripe.customers.list({ email: session.user.email, limit: 10 });
    const customer = customers.data.find(c => (c.metadata?.userId === session.user.id) || (c.email === session.user.email));
    if (!customer) return NextResponse.json({ total: 0, currency: 'eur', lines: [] });
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 });
    const currentSub = subs.data[0];
    if (!currentSub) return NextResponse.json({ total: 0, currency: 'eur', lines: [] });

    // Préparer un aperçu de facture à venir avec changement de prix
    const preview = await (stripe.invoices as any).retrieveUpcoming({
      customer: customer.id,
      subscription: currentSub.id,
      subscription_items: [{ id: currentSub.items.data[0].id, price: priceId }],
    });

    return NextResponse.json({
      total: preview.total,
      currency: preview.currency,
      lines: preview.lines?.data?.map((l: any) => ({ amount: l.amount, description: l.description })) || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


