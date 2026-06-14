import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { createNotification } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && /^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(value.trim());
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!isExpoPushToken(body?.token)) {
    return NextResponse.json({ error: 'Jeton push Expo invalide' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: body.token.trim(),
      p256dh: 'expo',
      auth: String(body.platform || 'android').slice(0, 24),
    }, { onConflict: 'user_id,endpoint' });

  if (error) {
    console.error('[native push] registration failed:', error.message);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce téléphone' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getApiSession(request);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!isExpoPushToken(body?.token)) {
    return NextResponse.json({ error: 'Jeton push Expo invalide' }, { status: 400 });
  }

  await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', body.token.trim())
    .eq('p256dh', 'expo');

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const session = await getApiSession(request);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  await createNotification({
    userId,
    type: 'general',
    title: 'Notifications Synaura actives',
    message: 'Ce téléphone recevra désormais tes alertes, même quand l’app est fermée.',
    actionUrl: '/notifications',
    skipPrefCheck: true,
    data: { nativePushTest: true },
  });

  return NextResponse.json({ ok: true });
}
