import { NextRequest, NextResponse } from 'next/server';
import { getApiSession, getSessionFromToken } from '@/lib/getApiSession';
import { stripe } from '@/lib/stripe';
import { findPackById, priceToCents } from '@/lib/billing/pricing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
    const session = accessToken ? await getSessionFromToken(accessToken) : await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    let email = session.user.email || null;
    if (!email) {
      email = await stripeCustomerEmail(session.user.id);
    }

    const { packId } = body;
    const pack = findPackById(packId);
    if (!pack) return NextResponse.json({ error: 'Pack introuvable' }, { status: 400 });

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      ...(email ? { customer_email: email } : {}),
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${pack.label} — ${pack.credits} crédits`,
              metadata: {
                type: 'ai_credits',
                packId: pack.id,
                credits_amount: String(pack.credits),
                is_pack: 'true',
              },
            },
            unit_amount: priceToCents(pack.priceEur),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/ai-generator?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/ai-generator?checkout=cancel`,
      metadata: {
        userId: session.user.id,
        packId: pack.id,
        credits_amount: String(pack.credits),
        is_pack: 'true',
      },
    });

    return NextResponse.json({ checkoutUrl: checkout.url, sessionId: checkout.id });
  } catch (e: any) {
    console.error('[Credits Checkout] Erreur:', e.message);
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}

async function stripeCustomerEmail(userId: string) {
  const { supabaseAdmin } = await import('@/lib/supabase');
  const [{ data: profile }, { data: authData }] = await Promise.all([
    supabaseAdmin.from('profiles').select('email').eq('id', userId).maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(userId),
  ]);
  return profile?.email || authData?.user?.email || null;
}
