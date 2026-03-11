import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  notify_new_bulletin: false,
  daily_email_summary: false,
};

async function getCallerMember(userId: string) {
  const { data } = await supabaseAdmin
    .from('meteo_team_members')
    .select('id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  return data;
}

async function ensureTable() {
  const { error } = await supabaseAdmin
    .from('meteo_settings')
    .select('id')
    .limit(1);
  return !error || (error.code !== '42P01' && !error.message?.includes('does not exist'));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const member = await getCallerMember(session.user.id);
    if (!member) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const tableExists = await ensureTable();
    if (!tableExists) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS });
    }

    const { data, error } = await supabaseAdmin
      .from('meteo_settings')
      .select('key, value')
      .in('key', Object.keys(DEFAULT_SETTINGS));

    if (error) {
      console.error('meteo/settings GET error:', error);
      return NextResponse.json({ settings: DEFAULT_SETTINGS });
    }

    const settings = { ...DEFAULT_SETTINGS };
    for (const row of data || []) {
      if (row.key in settings) {
        (settings as any)[row.key] = row.value === 'true' || row.value === true;
      }
    }

    return NextResponse.json({ settings });
  } catch (e) {
    console.error('meteo/settings GET error:', e);
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const member = await getCallerMember(session.user.id);
    if (!member || member.role !== 'admin') {
      return NextResponse.json({ error: 'Seul un admin peut modifier les parametres' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || !(key in DEFAULT_SETTINGS)) {
      return NextResponse.json({ error: 'Parametre invalide' }, { status: 400 });
    }

    const tableExists = await ensureTable();
    if (!tableExists) {
      return NextResponse.json({ error: 'Table meteo_settings non disponible. Executez la migration.' }, { status: 500 });
    }

    const { error } = await supabaseAdmin
      .from('meteo_settings')
      .upsert(
        { key, value: String(value), updated_at: new Date().toISOString(), updated_by: session.user.id },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('meteo/settings PATCH error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, key, value: Boolean(value) });
  } catch (e: any) {
    console.error('meteo/settings PATCH error:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
