import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { dbAdmin } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const body = await request.json();
    const { endpoint, keys } = body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 });
    }

    const { error } = await dbAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        platform: 'web',
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null,
      }, { onConflict: 'user_id,endpoint' });

    if (error) {
      console.error('Push subscribe error:', error);
      return NextResponse.json({ error: 'Erreur enregistrement' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const body = await request.json();
    const { endpoint } = body || {};
    if (!endpoint) return NextResponse.json({ error: 'Endpoint manquant' }, { status: 400 });

    await dbAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
