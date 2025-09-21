import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Trouver les subscriptions actives et les annuler immédiatement
    const customers = await stripe.customers.list({ email: session.user.email, limit: 10 });
    const customer = customers.data.find(c => (c.metadata?.userId === session.user.id) || (c.email === session.user.email));
    if (customer) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, limit: 10 });
      for (const s of subs.data) {
        if (s.status === 'active' || s.status === 'trialing' || s.status === 'past_due' || s.status === 'unpaid') {
          await stripe.subscriptions.cancel(s.id);
        }
      }
    }

    // MAJ immédiate profil côté app
    await supabaseAdmin.from('profiles').update({
      plan: 'free',
      subscription_status: 'canceled',
      subscription_current_period_end: null,
    }).eq('id', session.user.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


