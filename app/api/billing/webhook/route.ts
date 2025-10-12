import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get('stripe-signature') as string;
    const buf = Buffer.from(await req.arrayBuffer());
    const secret = process.env.STRIPE_WEBHOOK_SECRET as string;
    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, secret);
    } catch (err: any) {
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const userId = sub.metadata?.userId || sub.customer; // fallback si stocké différemment
        const status = sub.status as string; // active, trialing, canceled, unpaid...
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        const price = sub.items?.data?.[0]?.price;
        const planInterval = price?.recurring?.interval || 'month';
        const planName: string = (price?.product && typeof price.product === 'string') ? price.product : (price?.nickname || 'Pro');

        // Mettre à jour le profil utilisateur
        if (userId) {
          await supabaseAdmin.from('profiles').update({
            plan: status === 'active' ? (planInterval === 'year' ? 'pro' : 'starter') : 'free',
            subscription_status: status,
            subscription_current_period_end: currentPeriodEnd,
          }).eq('id', userId);
        }
        // Crédit mensuel (à chaque update/renewal active)
        if (userId && (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') && status === 'active') {
          const price = sub.items?.data?.[0]?.price;
          const nickname = price?.nickname || '';
          // Map simple: nickname/metadata vers montant de crédits
          let amount = 0;
          if (/starter/i.test(nickname)) amount = 120; else if (/pro/i.test(nickname)) amount = 360; else if (/enterprise/i.test(nickname)) amount = 1200;
          if (amount > 0) {
            await supabaseAdmin.rpc('ai_add_credits', { p_user_id: userId, p_amount: amount });
          }
        }
        break;
      }
      case 'checkout.session.completed': {
        const sessionObj = event.data.object as any;
        if (sessionObj.mode === 'payment') {
          // Identifier l'utilisateur: id direct, sinon email → lookup profil
          let userId: string | null = sessionObj.metadata?.userId || null;
          const email: string | undefined = sessionObj.customer_details?.email || sessionObj.metadata?.email;
          if (!userId && email) {
            const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle();
            userId = profile?.id || null;
          }

          // Créditer des crédits IA si c'est un achat de crédits
          const line = sessionObj.display_items?.[0] || sessionObj.line_items?.data?.[0];
          const meta = (line?.price?.product?.metadata || sessionObj.metadata || {}) as any;
          const base = parseInt(meta.baseCredits || '0', 10);
          const bonus = parseInt(meta.bonusCredits || '0', 10);
          const displayed = parseInt(meta.displayedCredits || '0', 10);
          let creditsToAdd = 0;
          if (displayed > 0) creditsToAdd = displayed; else if (base > 0) creditsToAdd = base + (bonus > 0 ? bonus : 0);
          // Fallback par montant si métadonnées absentes
          if (!creditsToAdd && typeof sessionObj.amount_total === 'number') {
            const amount = sessionObj.amount_total; // en cents
            const eur = Math.round(amount / 100);
            if (eur === 5 || eur === 6) creditsToAdd = 600; // 5.49 ≈ 5/6 arrondi
            else if (eur === 10 || eur === 11) creditsToAdd = 1200;
            else if (eur === 20 || eur === 21) creditsToAdd = 2400;
            else if (eur === 39 || eur === 40) creditsToAdd = 4800;
          }

          if (userId && creditsToAdd > 0) {
            await supabaseAdmin.rpc('ai_add_credits', { p_user_id: userId, p_amount: creditsToAdd });
          }
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur webhook' }, { status: 500 });
  }
}


