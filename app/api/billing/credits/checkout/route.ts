import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';
import { findPackById, priceToCents, CreditPackId } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { packId } = await req.json();
    const pack = findPackById((packId as CreditPackId));
    if (!pack) return NextResponse.json({ error: 'Pack introuvable' }, { status: 400 });

    // Créer un produit/price à la volée si nécessaire via mode payment + metadata
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: session.user.email as string,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${pack.label} — ${pack.displayedCredits} crédits (dont bonus)`,
              metadata: {
                userId: session.user.id,
                packId: pack.id,
                baseCredits: String(pack.baseCredits),
                bonusCredits: String(pack.bonusCredits),
                displayedCredits: String(pack.displayedCredits),
                type: 'ai_credits',
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
        baseCredits: String(pack.baseCredits),
        bonusCredits: String(pack.bonusCredits),
      },
    });

    return NextResponse.json({ checkoutUrl: checkout.url, sessionId: checkout.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur' }, { status: 500 });
  }
}


