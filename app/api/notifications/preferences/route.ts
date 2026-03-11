import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PREFS = {
  push_enabled: true,
  email_enabled: false,
  in_app_enabled: true,
  new_follower: true,
  new_like: true,
  like_milestone: true,
  new_comment: true,
  new_message: true,
  new_track_followed: true,
  view_milestone: true,
  boost_reminder: true,
  admin_broadcast: true,
  weekly_recap: false,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ preferences: { ...DEFAULT_PREFS, user_id: userId } });
    }

    return NextResponse.json({ preferences: data });
  } catch (e: any) {
    return NextResponse.json({ preferences: { ...DEFAULT_PREFS } });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const body = await request.json();

    const allowedKeys = Object.keys(DEFAULT_PREFS);
    const updates: Record<string, any> = { user_id: userId, updated_at: new Date().toISOString() };
    for (const key of allowedKeys) {
      if (key in body && typeof body[key] === 'boolean') {
        updates[key] = body[key];
      }
    }

    const { data, error } = await supabaseAdmin
      .from('notification_preferences')
      .upsert(updates, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[notif prefs] upsert error:', error);
      return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 });
    }

    return NextResponse.json({ preferences: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
