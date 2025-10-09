import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { stripe } from '@/lib/stripe';

// Codes promo personnalisés (en attendant de créer des Stripe Coupons)
const CUSTOM_PROMO_CODES: Record<string, { discount: number; type: string; message: string }> = {
  'LAUNCH2025': { discount: 10, type: 'percent', message: '-10% supplémentaire sur l\'offre de lancement !' },
  'WELCOME': { discount: 5, type: 'percent', message: '-5% de bienvenue' },
  'EARLY': { discount: 15, type: 'percent', message: '-15% early adopter !' },
  'VIP': { discount: 20, type: 'percent', message: '-20% VIP exclusif !' },
  'SYNAURA50': { discount: 50, type: 'percent', message: '-50% offre spéciale !' },
  'INFLUENCER': { discount: 100, type: 'percent', message: '-100% offre influenceur !' },
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 });
    }

    const upperCode = code.trim().toUpperCase();

    // Vérifier si c'est un code promo personnalisé
    if (CUSTOM_PROMO_CODES[upperCode]) {
      const promo = CUSTOM_PROMO_CODES[upperCode];
      return NextResponse.json({
        valid: true,
        code: upperCode,
        discount: promo.discount,
        type: promo.type,
        message: promo.message
      });
    }

    // Vérifier si c'est un coupon Stripe
    try {
      const coupons = await stripe.coupons.list({ limit: 100 });
      const stripeCoupon = coupons.data.find(c => c.id === upperCode || c.name === upperCode);

      if (stripeCoupon && stripeCoupon.valid) {
        const discount = stripeCoupon.percent_off || (stripeCoupon.amount_off ? stripeCoupon.amount_off / 100 : 0);
        return NextResponse.json({
          valid: true,
          code: upperCode,
          discount,
          type: stripeCoupon.percent_off ? 'percent' : 'amount',
          message: stripeCoupon.percent_off 
            ? `-${stripeCoupon.percent_off}% avec le code ${upperCode}` 
            : `-${(stripeCoupon.amount_off || 0) / 100}€ avec le code ${upperCode}`,
          stripeCouponId: stripeCoupon.id
        });
      }
    } catch (e) {
      console.error('Erreur vérification coupon Stripe:', e);
    }

    // Code invalide
    return NextResponse.json({ 
      valid: false,
      error: 'Code promo invalide ou expiré' 
    }, { status: 404 });

  } catch (e: any) {
    console.error('❌ Erreur validate-promo:', e);
    return NextResponse.json({ 
      error: e.message || 'Erreur interne' 
    }, { status: 500 });
  }
}

