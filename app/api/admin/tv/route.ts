import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { SYNAURA_TV_TABLE } from '@/lib/synauraTv';

export async function GET() {
  const g = await getAdminGuard();
  if (!g.userId) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });
  if (!g.ok) return NextResponse.json({ ok: false, error: 'Interdit' }, { status: 403 });

  const { data, error } = await supabaseAdmin.from(SYNAURA_TV_TABLE).select('*').eq('id', 1).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: 'Erreur base de données' }, { status: 500 });
  return NextResponse.json({ ok: true, settings: data || null });
}

export async function PATCH(req: NextRequest) {
  const g = await getAdminGuard();
  if (!g.userId) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });
  if (!g.ok) return NextResponse.json({ ok: false, error: 'Interdit' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    enabled?: boolean;
    provider?: string;
    playback_url?: string;
    rtmp_url?: string;
    stream_key?: string;
  };

  const patch: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
  if (typeof body.provider === 'string') patch.provider = body.provider;
  if (typeof body.playback_url === 'string') patch.playback_url = body.playback_url;
  if (typeof body.rtmp_url === 'string') patch.rtmp_url = body.rtmp_url;
  if (typeof body.stream_key === 'string') patch.stream_key = body.stream_key;

  const { data, error } = await supabaseAdmin
    .from(SYNAURA_TV_TABLE)
    .upsert({ id: 1, ...patch }, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: 'Erreur base de données' }, { status: 500 });
  return NextResponse.json({ ok: true, settings: data || null });
}

