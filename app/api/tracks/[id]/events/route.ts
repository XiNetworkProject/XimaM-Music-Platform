import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IncomingEvent = {
  event_type: string;
  position_ms?: number | null;
  duration_ms?: number | null;
  progress_pct?: number | null;
  source?: string | null;
  referrer?: string | null;
  platform?: string | null;
  country?: string | null;
  session_id?: string | null;
  artist_id?: string | null;
  is_ai_track?: boolean | null;
  extra?: any;
};

const ALLOWED_EVENTS = new Set([
  'view',
  'play_start',
  'play_progress',
  'play_complete',
  'like',
  'unlike',
  'share',
  'favorite',
  'unfavorite',
  'skip',
  'next',
  'prev',
  'add_to_playlist',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params?.id;
    if (!trackId) {
      return NextResponse.json({ error: 'track_id requis' }, { status: 400 });
    }

    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    const body = await request.json();
    const raw = Array.isArray(body?.events) ? body.events : [body];

    const now = new Date().toISOString();
    const rows = (raw as IncomingEvent[])
      .filter((e) => e && typeof e.event_type === 'string' && ALLOWED_EVENTS.has(e.event_type))
      .map((e) => ({
        created_at: now,
        track_id: trackId,
        artist_id: e.artist_id || null,
        user_id: userId,
        session_id: e.session_id || null,
        event_type: e.event_type as any,
        position_ms: e.position_ms ?? null,
        duration_ms: e.duration_ms ?? null,
        progress_pct: e.progress_pct ?? null,
        source: e.source || null,
        referrer: e.referrer || null,
        platform: e.platform || 'web',
        country: e.country || null,
        is_ai_track: Boolean(e.is_ai_track),
        extra: e.extra ?? null,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ inserted: 0 });
    }

    const { error } = await supabaseAdmin.from('track_events').insert(rows);
    if (error) {
      console.error('Erreur insertion track_events:', error);
      return NextResponse.json({ error: 'Erreur insertion' }, { status: 500 });
    }

    return NextResponse.json({ inserted: rows.length });
  } catch (error) {
    console.error('Erreur API events:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


