import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IncomingImpression = {
  contentType?: string;
  contentId?: string;
  source?: string;
  rank?: number;
  score?: number;
  reasons?: string[];
  isAiTrack?: boolean;
  eventType?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || null;
    const body = await request.json().catch(() => ({}));
    const raw = Array.isArray(body?.impressions) ? body.impressions : [body];
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
    const now = new Date().toISOString();

    const impressions = (raw as IncomingImpression[])
      .map((item, index) => ({
        created_at: now,
        user_id: userId,
        session_id: sessionId,
        content_type: item.contentType === 'post' ? 'post' : item.contentType === 'track' ? 'track' : '',
        content_id: String(item.contentId || ''),
        source: item.source || 'home',
        rank: Number.isFinite(item.rank) ? item.rank : index,
        score: Number.isFinite(item.score) ? item.score : null,
        reasons: Array.isArray(item.reasons) ? item.reasons.slice(0, 8) : null,
        event_type: typeof item.eventType === 'string' ? item.eventType.slice(0, 40) : 'view',
      }))
      .filter((item) => item.content_type && item.content_id);

    if (!impressions.length) {
      return NextResponse.json({ inserted: 0 });
    }

    try {
      const impressionRows = impressions.map(({ event_type, ...item }) => ({
        ...item,
        reasons: item.reasons
          ? [...item.reasons, event_type !== 'view' ? `event:${event_type}` : 'event:view'].slice(0, 8)
          : event_type !== 'view'
            ? [`event:${event_type}`]
            : null,
      }));
      await supabaseAdmin.from('recommendation_impressions').insert(impressionRows);
    } catch (error) {
      console.warn('recommendation impressions unavailable:', error);
    }

    const trackRows = impressions
      .filter((item) => item.content_type === 'track')
      .map((item) => ({
        created_at: now,
        track_id: item.content_id,
        user_id: userId,
        session_id: sessionId,
        event_type: item.event_type || 'view',
        source: item.source,
        platform: request.headers.get('authorization')?.startsWith('Bearer ') ? 'mobile' : 'web',
        is_ai_track: String(item.content_id).startsWith('ai-'),
        extra: { recommendation: true, rank: item.rank, score: item.score, reasons: item.reasons },
      }));

    if (trackRows.length) {
      try {
        await supabaseAdmin.from('track_events').insert(trackRows);
      } catch (error) {
        console.warn('track impression events unavailable:', error);
      }
    }

    return NextResponse.json({ inserted: impressions.length });
  } catch (error) {
    console.error('recommendation impressions error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
