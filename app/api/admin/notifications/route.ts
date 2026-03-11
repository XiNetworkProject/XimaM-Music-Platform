import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { createBroadcast } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await getAdminGuard();

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'broadcasts';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const offset = (page - 1) * limit;

    if (tab === 'broadcasts') {
      const { data, count } = await supabaseAdmin
        .from('admin_broadcasts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return NextResponse.json({ broadcasts: data || [], total: count || 0, page, limit });
    }

    if (tab === 'stats') {
      const { count: totalNotifs } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true });

      const { count: unreadNotifs } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      const { count: totalSubs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id', { count: 'exact', head: true });

      const { count: totalBroadcasts } = await supabaseAdmin
        .from('admin_broadcasts')
        .select('id', { count: 'exact', head: true });

      const { data: recentNotifs } = await supabaseAdmin
        .from('notifications')
        .select('type')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

      const typeBreakdown: Record<string, number> = {};
      (recentNotifs || []).forEach(n => {
        typeBreakdown[n.type] = (typeBreakdown[n.type] || 0) + 1;
      });

      return NextResponse.json({
        stats: {
          totalNotifications: totalNotifs || 0,
          unreadNotifications: unreadNotifs || 0,
          pushSubscriptions: totalSubs || 0,
          totalBroadcasts: totalBroadcasts || 0,
          last7daysBreakdown: typeBreakdown,
        },
      });
    }

    return NextResponse.json({ error: 'Tab invalide' }, { status: 400 });
  } catch (e: any) {
    if (e.message?.includes('admin')) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const g = await getAdminGuard();
    const body = await request.json();
    const { title, message, target, category } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Titre et message requis' }, { status: 400 });
    }

    const result = await createBroadcast({
      adminId: g.userId!,
      title,
      message,
      target: target || 'all',
      category: category || 'announcement',
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    if (e.message?.includes('admin')) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
