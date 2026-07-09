import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeRemixTrackRef } from '@/lib/remixServer';
import { canViewAiTrack, canViewTrack } from '@/lib/publicTracks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIN_PEAKS = 16;
const MAX_PEAKS = 1000;

async function loadViewableTrack(ref: { id: string; type: 'track' | 'ai_track' }, viewerId: string | null) {
  if (ref.type === 'ai_track') {
    const { data } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, is_public, generation:ai_generations!inner(user_id, is_public, status)')
      .eq('id', ref.id)
      .maybeSingle();
    if (!data || !canViewAiTrack(data, viewerId)) return null;
    return data;
  }
  const { data } = await supabaseAdmin
    .from('tracks')
    .select('id, is_public, creator_id, audio_url')
    .eq('id', ref.id)
    .maybeSingle();
  if (!data || !canViewTrack(data, viewerId)) return null;
  return data;
}

// GET /api/tracks/[id]/waveform — peaks + duree en cache (jamais recalcules
// serveur, uniquement lus). 404 si pas encore en cache : le client genere
// alors la vraie waveform depuis l'audio (Web Audio API) et la pousse via POST.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Track id requis' }, { status: 400 });

    const session = await getApiSession(request).catch(() => null);
    const viewerId = (session?.user as any)?.id || null;
    const ref = normalizeRemixTrackRef(id);

    const track = await loadViewableTrack(ref, viewerId);
    if (!track) return NextResponse.json({ error: 'Track introuvable' }, { status: 404 });

    const { data: cached, error } = await supabaseAdmin
      .from('track_waveforms')
      .select('duration, peaks')
      .eq('track_id', ref.id)
      .eq('track_type', ref.type)
      .maybeSingle();

    if (error) throw error;
    if (!cached) return NextResponse.json({ error: 'Waveform non generee' }, { status: 404 });

    return NextResponse.json({ duration: Number(cached.duration), peaks: cached.peaks });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/tracks/[id]/waveform — met en cache des peaks reellement calcules
// cote client (Web Audio API) depuis le fichier audio du morceau, pour eviter
// de redecoder l'audio a chaque ouverture. N'importe quel utilisateur connecte
// pouvant voir le morceau peut contribuer ce cache (donnee non sensible,
// derivee de l'audio deja public/accessible).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request).catch(() => null);
    const viewerId = (session?.user as any)?.id || null;
    if (!viewerId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Track id requis' }, { status: 400 });
    const ref = normalizeRemixTrackRef(id);

    const track = await loadViewableTrack(ref, viewerId);
    if (!track) return NextResponse.json({ error: 'Track introuvable' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const duration = Number(body?.duration);
    const peaksRaw = body?.peaks;

    if (!Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json({ error: 'duration invalide' }, { status: 400 });
    }
    if (!Array.isArray(peaksRaw) || peaksRaw.length < MIN_PEAKS || peaksRaw.length > MAX_PEAKS) {
      return NextResponse.json({ error: `peaks doit contenir entre ${MIN_PEAKS} et ${MAX_PEAKS} valeurs` }, { status: 400 });
    }
    const peaks = peaksRaw.map((v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
    });

    const { error } = await supabaseAdmin
      .from('track_waveforms')
      .upsert(
        { track_id: ref.id, track_type: ref.type, duration, peaks },
        { onConflict: 'track_id,track_type' },
      );
    if (error) throw error;

    return NextResponse.json({ duration, peaks });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
