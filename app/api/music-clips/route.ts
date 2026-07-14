import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { assertCanCreateClip, formatMusicClips } from '@/lib/musicClips';
import { normalizeRemixTrackRef } from '@/lib/remixServer';

function parseLimit(value: string | null) {
  const n = Number(value || 20);
  if (!Number.isFinite(n)) return 20;
  return Math.min(40, Math.max(1, Math.round(n)));
}

function parseCursor(value: string | null) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const limit = parseLimit(params.get('limit'));
    const cursor = parseCursor(params.get('cursor'));
    const sourceTrackId = params.get('sourceTrackId');
    const sourceTrackType = params.get('sourceTrackType');
    const creatorId = params.get('creatorId');
    const clipId = params.get('clipId');
    const session = await getApiSession(request).catch(() => null);
    const viewerId = session?.user?.id || null;

    let query = supabaseAdmin
      .from('music_clips')
      .select('*, creator:profiles!music_clips_creator_id_fkey(id, username, name, avatar)')
      .eq('visibility', 'published')
      .order('created_at', { ascending: false })
      .range(cursor, cursor + limit);

    if (sourceTrackId) {
      const ref = normalizeRemixTrackRef(sourceTrackId, sourceTrackType);
      query = query.eq('source_track_id', ref.id).eq('source_track_type', ref.type);
    }

    // Clips publiés par un créateur donné (ex: onglet Clips d'un profil) : la
    // source doit rester publique, deja garanti par formatMusicClips ci-dessous.
    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    if (clipId) {
      query = query.eq('id', clipId);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    const clips = await formatMusicClips(
      rows.slice(0, limit),
      { viewerId },
    );
    return NextResponse.json({
      clips,
      nextCursor: cursor + clips.length,
      hasMore: rows.length > limit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de charger les clips' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const permission = await assertCanCreateClip({
      sourceTrackId: String(body.sourceTrackId || ''),
      sourceTrackType: body.sourceTrackType,
      userId,
    });
    if (!permission.ok) return NextResponse.json({ error: permission.error }, { status: permission.status });

    const { data, error } = await supabaseAdmin
      .from('music_clips')
      .insert({
        creator_id: userId,
        source_track_id: permission.source.sourceTrackId,
        source_track_type: permission.source.sourceTrackType,
        source_track_offset_seconds: 0,
        source_track_duration_seconds: 30,
        visibility: 'draft',
      })
      .select('*, creator:profiles!music_clips_creator_id_fkey(id, username, name, avatar)')
      .single();

    if (error) throw error;
    const [clip] = await formatMusicClips([data]);
    return NextResponse.json({ clip }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de creer le brouillon' }, { status: 500 });
  }
}
