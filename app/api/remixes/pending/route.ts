import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { getRemixSourceSummary } from '@/lib/remixServer';

// Variations IA en attente d'approbation pour les morceaux source appartenant a
// l'utilisateur connecte ("Variations a valider"). Ne renvoie jamais une ligne
// dont la source appartient a quelqu'un d'autre : la portee est deduite des
// morceaux/creations reellement possedes par le proprietaire, pas d'un id fourni
// par le client.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const [{ data: ownedTracks }, { data: ownedGenerations }] = await Promise.all([
      supabaseAdmin.from('tracks').select('id').eq('creator_id', userId),
      supabaseAdmin.from('ai_generations').select('id').eq('user_id', userId),
    ]);

    const ownedTrackIds = (ownedTracks || []).map((row: any) => String(row.id));
    const generationIds = (ownedGenerations || []).map((row: any) => String(row.id));

    let ownedAiTrackIds: string[] = [];
    if (generationIds.length) {
      const { data: ownedAiTracks } = await supabaseAdmin
        .from('ai_tracks')
        .select('id')
        .in('generation_id', generationIds);
      ownedAiTrackIds = (ownedAiTracks || []).map((row: any) => String(row.id));
    }

    if (!ownedTrackIds.length && !ownedAiTrackIds.length) {
      return NextResponse.json({ variations: [] });
    }

    const [tracksPending, aiTracksPending] = await Promise.all([
      ownedTrackIds.length
        ? supabaseAdmin
            .from('track_remixes')
            .select('id, source_track_id, source_track_type, child_track_id, creator_id, created_at')
            .eq('remix_type', 'ai_variation')
            .eq('status', 'pending_approval')
            .eq('source_track_type', 'track')
            .in('source_track_id', ownedTrackIds)
        : Promise.resolve({ data: [] as any[] }),
      ownedAiTrackIds.length
        ? supabaseAdmin
            .from('track_remixes')
            .select('id, source_track_id, source_track_type, child_track_id, creator_id, created_at')
            .eq('remix_type', 'ai_variation')
            .eq('status', 'pending_approval')
            .eq('source_track_type', 'ai_track')
            .in('source_track_id', ownedAiTrackIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const rows = [...(tracksPending.data || []), ...(aiTracksPending.data || [])];
    if (!rows.length) return NextResponse.json({ variations: [] });

    rows.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const childIds = rows.map((row: any) => String(row.child_track_id));
    const creatorIds = Array.from(new Set(rows.map((row: any) => String(row.creator_id)).filter(Boolean)));

    const [{ data: aiTracks }, { data: creators }] = await Promise.all([
      supabaseAdmin
        .from('ai_tracks')
        .select('id, title, audio_url, image_url, duration, created_at, generation:ai_generations!inner(id, status)')
        .in('id', childIds),
      creatorIds.length
        ? supabaseAdmin.from('profiles').select('id, username, name, avatar').in('id', creatorIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const trackById = new Map((aiTracks || []).map((track: any) => [String(track.id), track]));
    const creatorById = new Map((creators || []).map((profile: any) => [String(profile.id), profile]));
    const sourceCache = new Map<string, any>();

    const variations = (
      await Promise.all(
        rows.map(async (row: any) => {
          const track = trackById.get(String(row.child_track_id));
          if (!track) return null;

          const sourceKey = `${row.source_track_type}:${row.source_track_id}`;
          if (!sourceCache.has(sourceKey)) {
            sourceCache.set(sourceKey, await getRemixSourceSummary({ sourceTrackId: row.source_track_id, sourceTrackType: row.source_track_type }));
          }
          const source = sourceCache.get(sourceKey);
          if (!source) return null;

          const creator = creatorById.get(String(row.creator_id));

          return {
            remixId: row.id,
            childTrackId: track.id,
            title: track.title || 'Variation IA',
            coverUrl: track.image_url || null,
            audioUrl: track.audio_url || '',
            duration: Number(track.duration || 0),
            createdAt: row.created_at,
            trackUrl: `/track/ai-${track.id}`,
            creator: {
              id: row.creator_id,
              username: creator?.username || '',
              name: creator?.name || creator?.username || 'Createur Synaura',
              avatar: creator?.avatar || null,
            },
            source: {
              sourceTrackId: source.sourceTrackType === 'ai_track' ? `ai-${source.sourceTrackId}` : source.sourceTrackId,
              sourceTrackType: source.sourceTrackType,
              title: source.title,
              coverUrl: source.coverUrl,
              trackUrl: source.trackUrl,
              artist: source.artist,
              artistUsername: source.artistUsername,
            },
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => Boolean(item));

    return NextResponse.json({ variations });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de charger les variations en attente' }, { status: 500 });
  }
}
