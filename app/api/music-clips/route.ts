import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { assertCanCreateClip, formatMusicClips } from '@/lib/musicClips';
import { normalizeRemixTrackRef } from '@/lib/remixServer';
import { buildAnonymousRecommendationSignals, buildUserRecommendationSignals, rankMusicClips } from '@/lib/recommendation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    let creatorId = params.get('creatorId');
    const creatorUsername = params.get('creatorUsername');
    const clipId = params.get('clipId');
    const recommendationSessionId = params.get('session')?.slice(0, 120) || null;
    const session = await getApiSession(request).catch(() => null);
    const viewerId = session?.user?.id || null;

    if (!creatorId && creatorUsername) {
      const { data: creator } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', creatorUsername)
        .maybeSingle();
      creatorId = creator?.id ? String(creator.id) : null;
      if (!creatorId) {
        return NextResponse.json(
          { clips: [], nextCursor: 0, hasMore: false },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } },
        );
      }
    }

    const isGeneralFeed = !sourceTrackId && !creatorId && !creatorUsername && !clipId;
    let query = supabaseAdmin
      .from('music_clips')
      .select('*, creator:profiles!music_clips_creator_id_fkey(id, username, name, avatar)')
      .order('created_at', { ascending: false });

    if (isGeneralFeed) query = query.limit(Math.min(240, Math.max(80, (cursor + limit) * 4)));
    else query = query.range(cursor, cursor + limit);

    if (!creatorId || String(creatorId) !== String(viewerId || '')) {
      query = query.eq('visibility', 'published');
    }

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
    const formatted = await formatMusicClips(isGeneralFeed ? rows : rows.slice(0, limit), { viewerId });
    let clips = formatted;
    if (isGeneralFeed) {
      const sourceCandidates = formatted.map((clip) => ({
        _id: clip.sourceTrackId,
        artist: clip.sourceTrack.artist,
        genre: clip.sourceTrack.genre || [],
        createdAt: clip.createdAt,
      }));
      const signals = viewerId
        ? await buildUserRecommendationSignals({
            supabase: supabaseAdmin,
            userId: viewerId,
            candidateTracks: sourceCandidates,
            sessionId: recommendationSessionId,
          })
        : buildAnonymousRecommendationSignals();
      const seed = recommendationSessionId || `${viewerId || 'anonymous'}:${new Date().toISOString().slice(0, 10)}:clips`;
      clips = rankMusicClips(formatted, signals, { sessionSeed: seed }).slice(cursor, cursor + limit);
    }
    const nextCursor = cursor + clips.length;
    return NextResponse.json(
      {
        clips,
        nextCursor,
        hasMore: isGeneralFeed ? nextCursor < formatted.length : rows.length > limit,
        engineVersion: isGeneralFeed ? 'discovery-v2' : undefined,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
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
