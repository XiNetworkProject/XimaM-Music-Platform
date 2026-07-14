import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { createNotification } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && /^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(value.trim());
}

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const { count, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('p256dh', 'expo');

  if (error) return NextResponse.json({ error: 'Verification du telephone impossible' }, { status: 500 });
  return NextResponse.json({
    registered: Number(count || 0) > 0,
    devices: Number(count || 0),
    database: 'supabase',
    transport: 'expo',
  });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!isExpoPushToken(body?.token)) {
    return NextResponse.json({ error: 'Jeton push Expo invalide' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const platform = body?.platform === 'ios' ? 'ios' : 'android';

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: body.token.trim(),
      p256dh: 'expo',
      auth: platform,
      platform,
      device_name: String(body?.deviceName || '').trim().slice(0, 120) || null,
      app_version: String(body?.appVersion || '').trim().slice(0, 40) || null,
      last_seen_at: now,
      updated_at: now,
      last_error: null,
    }, { onConflict: 'user_id,endpoint' });

  if (error) {
    console.error('[native push] registration failed:', error.message);
    return NextResponse.json({ error: 'Impossible d’enregistrer ce téléphone' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, registered: true, database: 'supabase', transport: 'expo' });
}

export async function DELETE(request: NextRequest) {
  const session = await getApiSession(request);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!isExpoPushToken(body?.token)) {
    return NextResponse.json({ error: 'Jeton push Expo invalide' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', body.token.trim())
    .eq('p256dh', 'expo');

  if (error) return NextResponse.json({ error: 'Suppression du téléphone impossible' }, { status: 500 });

  return NextResponse.json({ ok: true, database: 'supabase' });
}

export async function PATCH(request: NextRequest) {
  const session = await getApiSession(request);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const { count: registeredDevices, error: registrationError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('p256dh', 'expo');

  if (registrationError) {
    return NextResponse.json({ error: 'Vérification du téléphone impossible' }, { status: 500 });
  }

  const notification = await createNotification({
    userId,
    type: 'general',
    title: 'Centre de notifications actif',
    message: 'Cette alerte est enregistrée dans Supabase et disponible dans la cloche Synaura.',
    actionUrl: '/notifications',
    skipPrefCheck: true,
    data: { nativePushTest: true },
  });

  return NextResponse.json({
    ok: Boolean(notification),
    database: 'supabase',
    transport: 'expo',
    pushRequested: Number(registeredDevices || 0) > 0,
  });
}
