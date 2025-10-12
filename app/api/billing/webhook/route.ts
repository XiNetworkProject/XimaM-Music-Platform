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
          const userId = sessionObj.metadata?.userId || sessionObj.customer_details?.email; // fallback email
          // Créditer des crédits IA si c'est un achat de crédits
          const line = sessionObj.display_items?.[0] || sessionObj.line_items?.data?.[0];
          const meta = line?.price?.product?.metadata || sessionObj.metadata || {};
          const baseCredits = parseInt(meta.baseCredits || sessionObj.metadata?.baseCredits || '0', 10);
          if (userId && baseCredits > 0) {
            // Upsert balance
            await supabaseAdmin.rpc('ai_add_credits', { p_user_id: userId, p_amount: baseCredits });
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


