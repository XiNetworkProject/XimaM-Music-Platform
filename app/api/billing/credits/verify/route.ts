import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { findPackById } from '@/lib/billing/pricing';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });

    const cs = await stripe.checkout.sessions.retrieve(sessionId);
    if (cs.mode !== 'payment') return NextResponse.json({ error: 'Session non valide' }, { status: 400 });
    if (cs.payment_status !== 'paid') return NextResponse.json({ error: 'Paiement non confirmé', payment_status: cs.payment_status }, { status: 400 });

    const meta: any = cs.metadata || {};
    let creditsToAdd = 0;

    const packId = meta.packId;
    if (packId) {
      const pack = findPackById(packId);
      if (pack) creditsToAdd = pack.credits;
    }

    if (!creditsToAdd) {
      const amount = parseInt(meta.credits_amount || meta.displayedCredits || '0', 10);
      if (amount > 0) creditsToAdd = amount;
    }

    if (creditsToAdd <= 0) return NextResponse.json({ error: 'Pack non déterminé' }, { status: 400 });

    await supabaseAdmin.rpc('ai_add_credits', {
      p_user_id: session.user.id,
      p_amount: creditsToAdd,
      p_source: 'pack_purchase',
      p_description: `Vérification achat pack ${packId || 'inconnu'} (${creditsToAdd} crédits)`,
    });

    return NextResponse.json({ ok: true, added: creditsToAdd });
  } catch (e: any) {
    console.error('[Credits Verify] Erreur:', e.message);
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}
