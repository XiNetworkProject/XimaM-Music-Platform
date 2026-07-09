import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { getMusicChallengeDetail, type ChallengeClubSlug, type ChallengeContentType } from '@/lib/musicChallenges';
import { getRemixSourceSummary } from '@/lib/remixServer';
import { getClipSourceSummary } from '@/lib/musicClips';

// Detail/mise a jour/suppression admin d'un defi. Reutilise getMusicChallengeDetail
// (meme revalidation des participations que l'API publique /api/challenges/[id]) :
// aucune participation privee/pending/rejected/supprimee n'est jamais renvoyee ici.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_CONTENT_TYPES: ChallengeContentType[] = ['clip', 'variation', 'track', 'open'];
const VALID_CLUB_SLUGS: ChallengeClubSlug[] = ['feedback', 'collab', 'remix', 'ai'];
const VALID_SOURCE_TYPES = ['track', 'ai_track'];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await getAdminGuard();
  if (!guard.userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (!guard.ok) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const { id } = await params;
  const challenge = await getMusicChallengeDetail(decodeURIComponent(id || ''));
  if (!challenge) return NextResponse.json({ error: 'Defi introuvable.' }, { status: 404 });

  return NextResponse.json({ challenge });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await getAdminGuard();
  if (!guard.userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (!guard.ok) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const { id } = await params;
  const challengeId = decodeURIComponent(id || '');
  const { data: existing } = await supabaseAdmin.from('music_challenges').select('*').eq('id', challengeId).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Defi introuvable.' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, any> = {};

  // Actions rapides : "Activer maintenant" / "Terminer maintenant". Toujours
  // 1 seconde dans le passe/futur pour garantir un statut deterministe des la
  // prochaine lecture (computeChallengeStatus compare des dates strictes).
  if (body?.quickAction === 'activate_now') {
    update.starts_at = new Date(Date.now() - 1000).toISOString();
    const currentEnds = new Date(existing.ends_at).getTime();
    if (!Number.isFinite(currentEnds) || currentEnds <= Date.now()) {
      update.ends_at = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    }
  } else if (body?.quickAction === 'end_now') {
    update.ends_at = new Date(Date.now() - 1000).toISOString();
  } else {
    if (body?.title !== undefined) {
      const title = String(body.title || '').trim();
      if (!title) return NextResponse.json({ error: 'Titre requis.' }, { status: 400 });
      update.title = title;
    }
    if (body?.prompt !== undefined) {
      const prompt = String(body.prompt || '').trim();
      if (!prompt) return NextResponse.json({ error: 'Consigne requise.' }, { status: 400 });
      update.prompt = prompt;
    }
    if (body?.contentType !== undefined) {
      const contentType = String(body.contentType || '').trim();
      if (!VALID_CONTENT_TYPES.includes(contentType as ChallengeContentType)) {
        return NextResponse.json({ error: 'Type invalide.' }, { status: 400 });
      }
      update.content_type = contentType;
    }
    if (body?.startsAt !== undefined) {
      const startsAt = new Date(String(body.startsAt || ''));
      if (Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: 'Date de debut invalide.' }, { status: 400 });
      update.starts_at = startsAt.toISOString();
    }
    if (body?.endsAt !== undefined) {
      const endsAt = new Date(String(body.endsAt || ''));
      if (Number.isNaN(endsAt.getTime())) return NextResponse.json({ error: 'Date de fin invalide.' }, { status: 400 });
      update.ends_at = endsAt.toISOString();
    }
    const nextStarts = update.starts_at ? new Date(update.starts_at).getTime() : new Date(existing.starts_at).getTime();
    const nextEnds = update.ends_at ? new Date(update.ends_at).getTime() : new Date(existing.ends_at).getTime();
    if (nextEnds <= nextStarts) {
      return NextResponse.json({ error: 'La date de fin doit etre apres la date de debut.' }, { status: 400 });
    }

    if (body?.sourceTrackId !== undefined) update.source_track_id = String(body.sourceTrackId || '').trim() || null;
    if (body?.sourceTrackType !== undefined) {
      const sourceTrackType = String(body.sourceTrackType || '').trim() || null;
      if (sourceTrackType && !VALID_SOURCE_TYPES.includes(sourceTrackType)) {
        return NextResponse.json({ error: 'sourceTrackType doit etre "track" ou "ai_track".' }, { status: 400 });
      }
      update.source_track_type = sourceTrackType;
    }

    const nextSourceTrackId = update.source_track_id !== undefined ? update.source_track_id : existing.source_track_id;
    const nextSourceTrackType = update.source_track_type !== undefined ? update.source_track_type : existing.source_track_type;
    const nextContentType = update.content_type || existing.content_type;
    if (nextSourceTrackId) {
      if (nextContentType === 'clip') {
        const source = await getClipSourceSummary({ sourceTrackId: nextSourceTrackId, sourceTrackType: nextSourceTrackType });
        if (!source) return NextResponse.json({ error: 'Morceau source introuvable.' }, { status: 404 });
        if (!source.allowClips || source.remixVisibility === 'disabled') {
          return NextResponse.json({ error: "Ce morceau n'autorise pas les Clips." }, { status: 400 });
        }
      } else if (nextContentType === 'variation') {
        const source = await getRemixSourceSummary({ sourceTrackId: nextSourceTrackId, sourceTrackType: nextSourceTrackType });
        if (!source) return NextResponse.json({ error: 'Morceau source introuvable.' }, { status: 404 });
        if (!source.allowAiVariation || source.remixVisibility === 'disabled') {
          return NextResponse.json({ error: "Ce morceau n'autorise pas les variations IA." }, { status: 400 });
        }
      }
    }

    if (body?.clubSlug !== undefined) {
      const clubSlug = String(body.clubSlug || '').trim() || null;
      if (clubSlug && !VALID_CLUB_SLUGS.includes(clubSlug as ChallengeClubSlug)) {
        return NextResponse.json({ error: 'Club invalide.' }, { status: 400 });
      }
      update.club_slug = clubSlug;
    }
    if (body?.accentColor !== undefined) update.accent_color = String(body.accentColor || '').trim() || null;
    if (body?.coverUrl !== undefined) update.cover_url = String(body.coverUrl || '').trim() || null;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: 'Aucune modification fournie.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('music_challenges').update(update).eq('id', challengeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await getAdminGuard();
  if (!guard.userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (!guard.ok) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const { id } = await params;
  const challengeId = decodeURIComponent(id || '');
  // challenge_entries.challenge_id -> ON DELETE CASCADE (scripts/create_music_challenges.sql) :
  // supprime aussi les participations liees, sans toucher aux Clips/Variations/morceaux eux-memes.
  const { error } = await supabaseAdmin.from('music_challenges').delete().eq('id', challengeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
