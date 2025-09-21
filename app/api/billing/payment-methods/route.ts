import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';

async function getOrFindCustomerId(email: string, userId: string) {
  // Cherche un customer par email/metadata
  const list = await stripe.customers.list({ email, limit: 10 });
  const found = list.data.find(c => (c.metadata?.userId === userId) || (c.email === email));
  return found?.id || null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const customerId = await getOrFindCustomerId(session.user.email, session.user.id);
    if (!customerId) return NextResponse.json({ paymentMethods: [], defaultPaymentMethod: null });

    const customer = await stripe.customers.retrieve(customerId);
    const defaultPm = (customer as any)?.invoice_settings?.default_payment_method || null;
    const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
    return NextResponse.json({ paymentMethods: list.data, defaultPaymentMethod: typeof defaultPm === 'string' ? defaultPm : defaultPm?.id || null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) return NextResponse.json({ error: 'paymentMethodId requis' }, { status: 400 });
    const customerId = await getOrFindCustomerId(session.user.email, session.user.id);
    if (!customerId) return NextResponse.json({ error: 'Client Stripe introuvable' }, { status: 400 });
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) return NextResponse.json({ error: 'paymentMethodId requis' }, { status: 400 });
    await stripe.paymentMethods.detach(paymentMethodId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


