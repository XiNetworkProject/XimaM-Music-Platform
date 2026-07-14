import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { getClipSourceSummary } from '@/lib/musicClips';
import { normalizeRemixTrackRef } from '@/lib/remixServer';

function parseLimit(value: string | null) {
  const n = Number(value || 24);
  if (!Number.isFinite(n)) return 24;
  return Math.min(60, Math.max(1, Math.round(n)));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
    const rawPresetId = request.nextUrl.searchParams.get('sourceTrackId') || '';
    const preset = rawPresetId ? normalizeRemixTrackRef(rawPresetId, request.nextUrl.searchParams.get('sourceTrackType')) : null;
    const presetId = preset?.id || '';
    const presetType = preset?.type || 'track';
    const search = String(request.nextUrl.searchParams.get('query') || '')
      .trim()
      .replace(/[,%_().]/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 80);

    let tracksQuery = supabaseAdmin
        .from('tracks')
        .select('id')
        .eq('is_public', true)
        .eq('allow_clips', true)
        .order('created_at', { ascending: false })
        .limit(limit);
    let aiTracksQuery = supabaseAdmin
        .from('ai_tracks')
        .select('id, generation:ai_generations!inner(status)')
        .eq('is_public', true)
        .eq('allow_clips', true)
        .eq('generation.status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (search) {
      tracksQuery = tracksQuery.ilike('title', `%${search}%`);
      aiTracksQuery = aiTracksQuery.ilike('title', `%${search}%`);
    }
    const profilesQuery = search
      ? supabaseAdmin
          .from('profiles')
          .select('id')
          .or(`name.ilike.%${search}%,username.ilike.%${search}%,artist_name.ilike.%${search}%`)
          .limit(limit)
      : Promise.resolve({ data: [], error: null });
    const [tracksRes, aiTracksRes, profilesRes] = await Promise.all([tracksQuery, aiTracksQuery, profilesQuery]);

    if (tracksRes.error) throw tracksRes.error;
    if (aiTracksRes.error) throw aiTracksRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const artistIds = (profilesRes.data || []).map((row: any) => row.id).filter(Boolean);
    let artistTracks: Array<{ id: string }> = [];
    let artistAiTracks: Array<{ id: string }> = [];
    if (search && artistIds.length) {
      const [artistTracksRes, generationsRes] = await Promise.all([
        supabaseAdmin
          .from('tracks')
          .select('id')
          .eq('is_public', true)
          .eq('allow_clips', true)
          .in('creator_id', artistIds)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabaseAdmin
          .from('ai_generations')
          .select('id')
          .in('user_id', artistIds)
          .eq('status', 'completed')
          .limit(limit * 2),
      ]);
      if (artistTracksRes.error) throw artistTracksRes.error;
      if (generationsRes.error) throw generationsRes.error;
      artistTracks = artistTracksRes.data || [];
      const generationIds = (generationsRes.data || []).map((row: any) => row.id).filter(Boolean);
      if (generationIds.length) {
        const artistAiTracksRes = await supabaseAdmin
          .from('ai_tracks')
          .select('id')
          .eq('is_public', true)
          .eq('allow_clips', true)
          .in('generation_id', generationIds)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (artistAiTracksRes.error) throw artistAiTracksRes.error;
        artistAiTracks = artistAiTracksRes.data || [];
      }
    }

    const seen = new Set<string>();
    const candidates = [
      ...(tracksRes.data || []).map((row: any) => ({ id: row.id, type: 'track' as const })),
      ...(aiTracksRes.data || []).map((row: any) => ({ id: row.id, type: 'ai_track' as const })),
      ...artistTracks.map((row) => ({ id: row.id, type: 'track' as const })),
      ...artistAiTracks.map((row) => ({ id: row.id, type: 'ai_track' as const })),
    ].filter((candidate) => {
      const key = `${candidate.type}:${candidate.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Le morceau demandé en préselection (venu d'un bouton "Utiliser ce son") peut être
    // hors de la fenêtre "created_at desc limit" ci-dessus : on l'ajoute explicitement
    // pour garantir qu'il apparaisse dans la liste s'il est réellement autorisé.
    if (presetId && !candidates.some((c) => c.id === presetId && c.type === presetType)) {
      candidates.unshift({ id: presetId, type: presetType });
    }

    const sources = (await Promise.all(
      candidates.slice(0, limit * 2).map((candidate) =>
        getClipSourceSummary({ sourceTrackId: candidate.id, sourceTrackType: candidate.type, userId }),
      ),
    ))
      .filter((source) => source?.canCreateClip)
      .slice(0, limit);

    if (presetId) {
      const index = sources.findIndex((source) => source!.sourceTrackId === presetId && source!.sourceTrackType === presetType);
      if (index > 0) {
        const [presetSource] = sources.splice(index, 1);
        sources.unshift(presetSource);
      }
    }

    return NextResponse.json({ sources });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de charger les morceaux autorises' }, { status: 500 });
  }
}
