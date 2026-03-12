import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAdminGuard } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const g = await getAdminGuard();
    if (!g.ok) return NextResponse.json({ error: 'Admin requis' }, { status: 403 });

    const results: Record<string, any> = {};

    // 1. Verifier si la table notifications existe en tentant un select
    const { error: notifErr } = await supabaseAdmin.from('notifications').select('id').limit(1);

    if (notifErr && notifErr.message.includes('does not exist')) {
      // Creer la table via RPC ou raw query
      const { error: createErr } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            type TEXT NOT NULL DEFAULT 'general',
            title TEXT NOT NULL DEFAULT '',
            message TEXT NOT NULL DEFAULT '',
            data JSONB DEFAULT '{}',
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
          CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
        `
      });
      results.notifications_table = createErr ? { created: false, error: createErr.message } : { created: true };
    } else {
      results.notifications_table = { exists: true };
    }

    // 2. Tenter d'ajouter les colonnes etendues
    for (const col of [
      { name: 'category', def: "TEXT DEFAULT 'general'" },
      { name: 'icon_url', def: 'TEXT' },
      { name: 'action_url', def: 'TEXT' },
      { name: 'sender_id', def: 'UUID' },
      { name: 'related_id', def: 'TEXT' },
      { name: 'expires_at', def: 'TIMESTAMP WITH TIME ZONE' },
    ]) {
      const { error: colErr } = await supabaseAdmin
        .from('notifications')
        .select(col.name)
        .limit(1);

      if (colErr && colErr.message.includes(col.name)) {
        const { error: alterErr } = await supabaseAdmin.rpc('exec_sql', {
          sql: `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ${col.name} ${col.def};`
        });
        results[`col_${col.name}`] = alterErr ? { added: false, error: alterErr.message } : { added: true };
      } else {
        results[`col_${col.name}`] = { exists: true };
      }
    }

    // 3. notification_preferences
    const { error: prefsErr } = await supabaseAdmin.from('notification_preferences').select('id').limit(1);
    if (prefsErr && prefsErr.message.includes('does not exist')) {
      const { error: createPrefsErr } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS notification_preferences (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL,
            push_enabled BOOLEAN DEFAULT TRUE,
            email_enabled BOOLEAN DEFAULT FALSE,
            in_app_enabled BOOLEAN DEFAULT TRUE,
            new_follower BOOLEAN DEFAULT TRUE,
            new_like BOOLEAN DEFAULT TRUE,
            like_milestone BOOLEAN DEFAULT TRUE,
            new_comment BOOLEAN DEFAULT TRUE,
            new_message BOOLEAN DEFAULT TRUE,
            new_track_followed BOOLEAN DEFAULT TRUE,
            view_milestone BOOLEAN DEFAULT TRUE,
            boost_reminder BOOLEAN DEFAULT TRUE,
            admin_broadcast BOOLEAN DEFAULT TRUE,
            weekly_recap BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
          );
        `
      });
      results.notification_preferences = createPrefsErr ? { created: false, error: createPrefsErr.message } : { created: true };
    } else {
      results.notification_preferences = { exists: true };
    }

    // 4. admin_broadcasts
    const { error: broadErr } = await supabaseAdmin.from('admin_broadcasts').select('id').limit(1);
    if (broadErr && broadErr.message.includes('does not exist')) {
      const { error: createBroadErr } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS admin_broadcasts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            admin_id UUID NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            category TEXT DEFAULT 'announcement',
            target TEXT DEFAULT 'all',
            target_data JSONB DEFAULT '{}',
            sent_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      results.admin_broadcasts = createBroadErr ? { created: false, error: createBroadErr.message } : { created: true };
    } else {
      results.admin_broadcasts = { exists: true };
    }

    // 5. push_subscriptions
    const { error: pushErr } = await supabaseAdmin.from('push_subscriptions').select('id').limit(1);
    if (pushErr && pushErr.message.includes('does not exist')) {
      const { error: createPushErr } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, endpoint)
          );
          CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
        `
      });
      results.push_subscriptions = createPushErr ? { created: false, error: createPushErr.message } : { created: true };
    } else {
      results.push_subscriptions = { exists: true };
    }

    // 6. Test insert
    const { data: testInsert, error: testErr } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: g.userId,
        type: 'admin_broadcast',
        title: 'Systeme de notifications actif',
        message: 'Les notifications Synaura sont maintenant fonctionnelles !',
        data: { setup: true },
        is_read: false,
      })
      .select('id')
      .single();

    results.test_insert = testErr ? { ok: false, error: testErr.message } : { ok: true, id: testInsert?.id };

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const checks: Record<string, any> = {};

    const tables = ['notifications', 'notification_preferences', 'admin_broadcasts', 'push_subscriptions'];
    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).select('id').limit(1);
      checks[table] = error ? { exists: false, error: error.message } : { exists: true };
    }

    if (checks.notifications.exists) {
      const cols = ['category', 'action_url', 'icon_url', 'sender_id', 'related_id'];
      for (const col of cols) {
        const { error } = await supabaseAdmin.from('notifications').select(col).limit(1);
        checks[`notifications.${col}`] = error ? { exists: false } : { exists: true };
      }

      const { count } = await supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true });
      checks.total_notifications = count || 0;

      // Afficher les user_ids distincts et un echantillon
      const { data: sample } = await supabaseAdmin
        .from('notifications')
        .select('id, user_id, type, title, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      checks.recent_sample = sample || [];

      // Compter par user_id
      const userCounts: Record<string, number> = {};
      if (sample) {
        for (const n of sample) {
          userCounts[n.user_id] = (userCounts[n.user_id] || 0) + 1;
        }
      }
      checks.users_in_notifications = userCounts;

      // Lister les profiles pour comparaison
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, username, email')
        .limit(20);
      checks.profiles = (profiles || []).map((p: any) => ({ id: p.id, username: p.username, email: p.email }));
    }

    checks.vapid_configured = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

    return NextResponse.json(checks);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
