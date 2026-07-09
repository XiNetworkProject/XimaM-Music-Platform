import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { canViewTrack } from '@/lib/publicTracks';
import { isMomentReactionType } from '@/lib/momentReactions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_REACTIONS = 500;

// Mêmes sources désactivées que les commentaires horodatés (radio, créations IA) :
// pas de piste audio stable/appartenant à un créateur identifiable à réagir dessus.
function isDisabledTrack(trackId: string) {
  return trackId === 'radio-mixx-party' || trackId === 'radio-ximam' || trackId.startsWith('ai-');
}

async function loadViewableTrack(trackId: string, viewerId: string | null) {
  const { data } = await supabaseAdmin
    .from('tracks')
    .select('id, is_public, creator_id, audio_url')
    .eq('id', trackId)
    .maybeSingle();
  if (!data || !canViewTrack(data, viewerId)) return null;
  return data;
}

// GET /api/tracks/[id]/reactions — liste brute des réactions horodatées : pas de
// texte, pas d'identité utilisateur exposée (agrégat visuel, pas un fil social).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const trackId = params.id;
    if (!trackId || isDisabledTrack(trackId)) return NextResponse.json({ reactions: [] });

    const session = await getApiSession(request).catch(() => null);
    const viewerId = (session?.user as any)?.id || null;
    const track = await loadViewableTrack(trackId, viewerId);
    if (!track) return NextResponse.json({ reactions: [] });

    const { data, error } = await supabaseAdmin
      .from('track_moment_reactions')
      .select('id, reaction_type, timestamp_seconds')
      .eq('track_id', trackId)
      .order('timestamp_seconds', { ascending: true })
      .limit(MAX_REACTIONS);
    if (error) throw error;

    return NextResponse.json({
      reactions: (data || []).map((row: any) => ({
        id: row.id,
        reactionType: row.reaction_type,
        timestampSeconds: Number(row.timestamp_seconds),
      })),
    });
  } catch {
    // Les réactions sont un enrichissement, jamais une donnée bloquante.
    return NextResponse.json({ reactions: [] });
  }
}

// POST /api/tracks/[id]/reactions — ajoute une réaction rapide (emoji prédéfini)
// à l'instant de lecture courant. Idempotent : un doublon exact (même utilisateur,
// même réaction, même seconde) ne crée pas de deuxième ligne (double-clic).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const trackId = params.id;
    if (!trackId || isDisabledTrack(trackId)) {
      return NextResponse.json({ error: 'Réactions non disponibles sur cette source' }, { status: 400 });
    }

    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || null;
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const track = await loadViewableTrack(trackId, userId);
    if (!track) return NextResponse.json({ error: 'Morceau introuvable' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const reactionType = body?.reactionType;
    if (!isMomentReactionType(reactionType)) {
      return NextResponse.json({ error: 'Réaction invalide' }, { status: 400 });
    }
    const rawTimestamp = Number(body?.timestampSeconds);
    if (!Number.isFinite(rawTimestamp) || rawTimestamp < 0) {
      return NextResponse.json({ error: 'timestampSeconds invalide' }, { status: 400 });
    }
    const timestampSeconds = Math.round(rawTimestamp);

    const { data, error } = await supabaseAdmin
      .from('track_moment_reactions')
      .upsert(
        { track_id: trackId, user_id: userId, reaction_type: reactionType, timestamp_seconds: timestampSeconds },
        { onConflict: 'track_id,user_id,reaction_type,timestamp_seconds' },
      )
      .select('id, reaction_type, timestamp_seconds')
      .single();
    if (error) throw error;

    return NextResponse.json({
      reaction: { id: data.id, reactionType: data.reaction_type, timestampSeconds: Number(data.timestamp_seconds) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
