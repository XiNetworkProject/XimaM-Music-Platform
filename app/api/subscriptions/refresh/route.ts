import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Retrouver customer par email/metadata
    const customers = await stripe.customers.list({ email: session.user.email, limit: 10 });
    const customer = customers.data.find(c => (c.metadata?.userId === session.user.id) || (c.email === session.user.email));
    if (!customer) {
      await supabaseAdmin.from('profiles').update({ plan: 'free', subscription_status: 'canceled', subscription_current_period_end: null }).eq('id', session.user.id);
      return NextResponse.json({ ok: true, status: 'free' });
    }

    // Prendre la souscription la plus récente
    const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 3, expand: ['data.items.data.price.product'] });
    const current = subs.data[0];
    if (!current) {
      await supabaseAdmin.from('profiles').update({ plan: 'free', subscription_status: 'canceled', subscription_current_period_end: null }).eq('id', session.user.id);
      return NextResponse.json({ ok: true, status: 'free' });
    }

    const status = current.status; // active, trialing, past_due, unpaid, canceled
    let plan: 'free' | 'starter' | 'pro' | 'enterprise' = 'free';
    if (status === 'active' || status === 'trialing' || status === 'past_due' || status === 'unpaid') {
      const env = process.env;
      const priceId = current.items.data[0]?.price?.id as string | undefined;
      if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH || priceId === env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR) plan = 'starter';
      else if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH || priceId === env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR) plan = 'pro';
      else if (priceId === env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTH || priceId === env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEAR) plan = 'enterprise';
      else {
        const nick = (current.items.data[0]?.price?.nickname || '').toLowerCase();
        const prodName = (typeof current.items.data[0]?.price?.product === 'object' ? (current.items.data[0]?.price?.product as any)?.name : '')?.toLowerCase() || '';
        const txt = `${nick} ${prodName}`;
        if (/(starter|basic)/.test(txt)) plan = 'starter';
        else if (/(pro|professional)/.test(txt)) plan = 'pro';
        else if (/(enterprise)/.test(txt)) plan = 'enterprise';
        else plan = 'starter';
      }
    }

    const periodEndUnix = (current as any).current_period_end as number | undefined;
    const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
    await supabaseAdmin.from('profiles').update({ plan, subscription_status: status, subscription_current_period_end: periodEnd }).eq('id', session.user.id);

    return NextResponse.json({ ok: true, status, plan });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


