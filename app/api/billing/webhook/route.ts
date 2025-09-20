import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export const config = { api: { bodyParser: false } } as any;

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


