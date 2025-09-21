import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Trouver customer & subscription active
    const customers = await stripe.customers.list({ email: session.user.email, limit: 10 });
    const customer = customers.data.find(c => (c.metadata?.userId === session.user.id) || (c.email === session.user.email));
    if (!customer) return NextResponse.json({ ok: true });
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 });
    const currentSub = subs.data[0];
    if (!currentSub) return NextResponse.json({ ok: true });

    // Annuler à la fin de période
    const updated = await stripe.subscriptions.update(currentSub.id, { cancel_at_period_end: true });

    // MAJ profil
    const periodEnd = updated.current_period_end ? new Date(updated.current_period_end * 1000).toISOString() : null;
    await supabaseAdmin.from('profiles').update({ subscription_status: updated.status, subscription_current_period_end: periodEnd }).eq('id', session.user.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


