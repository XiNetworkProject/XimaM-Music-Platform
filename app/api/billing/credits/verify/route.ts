import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });

    const cs = await stripe.checkout.sessions.retrieve(sessionId);
    if (cs.mode !== 'payment') return NextResponse.json({ error: 'Session non valide' }, { status: 400 });
    if (cs.payment_status !== 'paid') return NextResponse.json({ error: 'Paiement non confirmé', payment_status: cs.payment_status }, { status: 400 });

    // Calculer crédits comme dans le webhook
    const meta: any = (cs.metadata as any) || {};
    const base = parseInt(meta.baseCredits || '0', 10);
    const bonus = parseInt(meta.bonusCredits || '0', 10);
    const displayed = parseInt(meta.displayedCredits || '0', 10);
    let creditsToAdd = 0;
    if (displayed > 0) creditsToAdd = displayed; else if (base > 0) creditsToAdd = base + (bonus > 0 ? bonus : 0);
    if (!creditsToAdd && typeof cs.amount_total === 'number') {
      const eur = Math.round(cs.amount_total / 100);
      if (eur === 5 || eur === 6) creditsToAdd = 600; else if (eur === 10 || eur === 11) creditsToAdd = 1200; else if (eur === 20 || eur === 21) creditsToAdd = 2400; else if (eur === 39 || eur === 40) creditsToAdd = 4800;
    }
    if (creditsToAdd <= 0) return NextResponse.json({ error: 'Pack non déterminé' }, { status: 400 });

    await supabaseAdmin.rpc('ai_add_credits', { p_user_id: session.user.id, p_amount: creditsToAdd });
    return NextResponse.json({ ok: true, added: creditsToAdd });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


