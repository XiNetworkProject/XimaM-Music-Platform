import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getApiSession } from '@/lib/getApiSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_CATEGORIES = ['general', 'admin', 'boost', 'milestone'];

function applyCategoryFilter(query: any, category: string | null) {
  if (!category || category === 'all') return query;
  if (category === 'system') return query.in('category', SYSTEM_CATEGORIES);
  return query.eq('category', category);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '30'));
    const category = searchParams.get('category');
    const unreadOnly = searchParams.get('unread') === 'true';
    const countOnly = searchParams.get('countOnly') === 'true';
    const offset = (page - 1) * limit;

    if (countOnly) {
      const { count: unreadCount, error: unreadError } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (unreadError) {
        console.error('[notifications] unread count error:', unreadError);
        return NextResponse.json({ error: 'Compteur Supabase indisponible' }, { status: 503 });
      }

      return NextResponse.json({
        unread: unreadCount || 0,
        source: 'supabase',
        syncedAt: new Date().toISOString(),
      });
    }

    const unreadCountPromise = supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    query = applyCategoryFilter(query, category);
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    let { data: notifications, count, error } = await query;

    // Fallback: si le filtre category cause une erreur (colonne inexistante), re-essayer sans
    if (error && category && category !== 'all') {
      console.warn('[notifications] category filter failed, retrying without:', error.message);
      let fallbackQuery = supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (unreadOnly) fallbackQuery = fallbackQuery.eq('is_read', false);
      const fallback = await fallbackQuery;
      notifications = fallback.data;
      count = fallback.count;
      error = fallback.error;
    }

    if (error) {
      console.error('[notifications] fetch error:', error);
      return NextResponse.json({ error: 'Lecture Supabase indisponible' }, { status: 503 });
    }

    // Enrichir les notifs du schema de base avec les metadonnees stockees dans data
    const enriched = (notifications || []).map((n: any) => ({
      ...n,
      category: n.category || n.data?.category || 'general',
      action_url: n.action_url || n.data?.action_url || null,
      icon_url: n.icon_url || n.data?.icon_url || null,
      sender_id: n.sender_id || n.data?.sender_id || null,
      related_id: n.related_id || n.data?.related_id || null,
    }));

    const { count: unreadCount, error: unreadError } = await unreadCountPromise;

    if (unreadError) {
      console.error('[notifications] unread count error:', unreadError);
      return NextResponse.json({ error: 'Compteur Supabase indisponible' }, { status: 503 });
    }

    return NextResponse.json({
      notifications: enriched,
      total: count || 0,
      unread: unreadCount || 0,
      page,
      limit,
      source: 'supabase',
      syncedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[notifications] GET error:', e);
    return NextResponse.json({ error: 'Centre de notifications indisponible' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const body = await request.json();
    const { action, notificationId, notificationIds } = body;

    if (action === 'mark_read' && notificationId) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);
      if (error) return NextResponse.json({ error: 'Mise à jour Supabase impossible' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'mark_all_read') {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (error) return NextResponse.json({ error: 'Mise à jour Supabase impossible' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'mark_batch_read' && Array.isArray(notificationIds)) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .in('id', notificationIds);
      if (error) return NextResponse.json({ error: 'Mise à jour Supabase impossible' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const body = await request.json();
    const { notificationId, clearAll } = body;

    if (clearAll) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', userId);
      if (error) return NextResponse.json({ error: 'Suppression Supabase impossible' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (notificationId) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);
      if (error) return NextResponse.json({ error: 'Suppression Supabase impossible' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Params manquants' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
