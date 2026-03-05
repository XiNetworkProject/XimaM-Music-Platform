import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { getPlanByPriceId, findPackById, PLANS } from '@/lib/billing/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function detectPlanFromPrice(price: any): { planKey: string; monthlyCredits: number } | null {
  if (!price) return null;
  const priceId: string = price.id || '';

  const matched = getPlanByPriceId(priceId);
  if (matched) return { planKey: matched.key, monthlyCredits: matched.monthlyCredits };

  const nickname = (price.nickname || '').toLowerCase();
  if (/pro/i.test(nickname)) return { planKey: 'pro', monthlyCredits: PLANS.pro.monthlyCredits };
  if (/starter/i.test(nickname)) return { planKey: 'starter', monthlyCredits: PLANS.starter.monthlyCredits };

  return null;
}

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
        const userId = sub.metadata?.userId || sub.customer;
        const status = sub.status as string;
        const currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        const price = sub.items?.data?.[0]?.price;
        const detected = detectPlanFromPrice(price);
        const planKey = detected?.planKey || 'free';

        if (userId) {
          await supabaseAdmin.from('profiles').update({
            plan: status === 'active' ? planKey : 'free',
            subscription_status: status,
            subscription_current_period_end: currentPeriodEnd,
          }).eq('id', userId);
        }

        if (
          userId &&
          (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') &&
          status === 'active' &&
          detected &&
          detected.monthlyCredits > 0
        ) {
          await supabaseAdmin.rpc('ai_add_credits', {
            p_user_id: userId,
            p_amount: detected.monthlyCredits,
            p_source: 'subscription_grant',
            p_description: `Crédits mensuels plan ${detected.planKey}`,
          });
        }
        break;
      }

      case 'checkout.session.completed': {
        const sessionObj = event.data.object as any;
        if (sessionObj.mode === 'payment' && sessionObj.payment_status === 'paid') {
          let userId: string | null = sessionObj.metadata?.userId || null;
          const email: string | undefined =
            sessionObj.customer_details?.email || sessionObj.metadata?.email;
          if (!userId && email) {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('email', email)
              .maybeSingle();
            userId = profile?.id || null;
          }

          let creditsToAdd = 0;
          const meta = sessionObj.metadata || {};
          const packId = meta.packId;

          if (packId) {
            const pack = findPackById(packId);
            if (pack) {
              creditsToAdd = pack.credits;
            }
          }

          if (!creditsToAdd) {
            const displayed = parseInt(meta.displayedCredits || meta.credits_amount || '0', 10);
            if (displayed > 0) creditsToAdd = displayed;
          }

          if (userId && creditsToAdd > 0) {
            await supabaseAdmin.rpc('ai_add_credits', {
              p_user_id: userId,
              p_amount: creditsToAdd,
              p_source: 'pack_purchase',
              p_description: `Achat pack ${packId || 'inconnu'} (${creditsToAdd} crédits)`,
            });
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error('[Webhook Stripe] Erreur:', e.message);
    return NextResponse.json({ error: e.message || 'Erreur webhook' }, { status: 500 });
  }
}
