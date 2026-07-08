import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { getRemixSourceSummary, normalizeRemixTrackRef } from '@/lib/remixServer';

// Liste les morceaux Synaura publics qui autorisent la variation IA (allow_ai_variation),
// pour alimenter le selecteur "Creer une variation" quand aucune source n'est deja fournie
// (hub Creer, Studio). Lecture seule : ne modifie ni les permissions ni le moteur de remix.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
        .eq('allow_ai_variation', true)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('ai_tracks')
        .select('id, generation:ai_generations!inner(status)')
        .eq('is_public', true)
        .eq('allow_ai_variation', true)
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
    if (presetId && !candidates.some((c) => c.id === presetId && c.type === presetType)) {
      candidates.unshift({ id: presetId, type: presetType });
    }

    const sources = (await Promise.all(
      candidates.slice(0, limit * 2).map((candidate) =>
        getRemixSourceSummary({ sourceTrackId: candidate.id, sourceTrackType: candidate.type, userId }),
      ),
    ))
      .filter((source): source is NonNullable<typeof source> => Boolean(source?.canRemixAiVariation))
      .slice(0, limit);

    if (presetId) {
      const index = sources.findIndex((source) => source.sourceTrackId === presetId && source.sourceTrackType === presetType);
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
