import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Retrouver le client et la dernière facture ouverte/past_due
    const customers = await stripe.customers.list({ email: session.user.email, limit: 10 });
    const customer = customers.data.find(c => (c.metadata?.userId === session.user.id) || (c.email === session.user.email));
    if (!customer) return NextResponse.json({ ok: true });

    // Récupérer la dernière facture ouverte
    const invoices = await stripe.invoices.list({ customer: customer.id, limit: 1, status: 'open' as any });
    const invoice = invoices.data[0];
    if (!invoice) return NextResponse.json({ ok: true });

    const invoiceId = invoice.id as string;
    const defaultPm = (customer as any)?.invoice_settings?.default_payment_method;
    const paid = (defaultPm && typeof defaultPm === 'string')
      ? await stripe.invoices.pay(invoiceId, { payment_method: defaultPm })
      : await stripe.invoices.pay(invoiceId);
    return NextResponse.json({ ok: paid.status === 'paid', status: paid.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}
