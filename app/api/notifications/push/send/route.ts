import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@synaura.fr';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, body: notifBody, url, icon, tag } = body || {};

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId et title requis' }, { status: 400 });
    }

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (!subs?.length) {
      return NextResponse.json({ sent: 0, reason: 'no_subscriptions' });
    }

    const payload = JSON.stringify({
      title: title || 'Synaura',
      body: notifBody || '',
      icon: icon || '/synaura_symbol.svg',
      badge: '/synaura_symbol.svg',
      url: url || '/boosters',
      tag: tag || 'boost-reminder',
    });

    let sent = 0;
    const expired: string[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 3600 }
        );
        sent++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expired.push(sub.endpoint);
        }
      }
    }

    if (expired.length) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .in('endpoint', expired);
    }

    return NextResponse.json({ sent, expired: expired.length });
  } catch (err: any) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
