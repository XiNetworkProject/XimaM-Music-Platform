import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { getClipSourceSummary } from '@/lib/musicClips';
import { normalizeRemixTrackRef } from '@/lib/remixServer';

function parseLimit(value: string | null) {
  const n = Number(value || 60);
  if (!Number.isFinite(n)) return 60;
  return Math.min(100, Math.max(1, Math.round(n)));
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

    const [tracksRes, aiTracksRes] = await Promise.all([
      supabaseAdmin
        .from('tracks')
        .select('id')
        .eq('is_public', true)
        .eq('allow_clips', true)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('ai_tracks')
        .select('id, generation:ai_generations!inner(status)')
        .eq('is_public', true)
        .eq('allow_clips', true)
        .eq('generation.status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (tracksRes.error) throw tracksRes.error;
    if (aiTracksRes.error) throw aiTracksRes.error;

    const candidates = [
      ...(tracksRes.data || []).map((row: any) => ({ id: row.id, type: 'track' as const })),
      ...(aiTracksRes.data || []).map((row: any) => ({ id: row.id, type: 'ai_track' as const })),
    ];
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
