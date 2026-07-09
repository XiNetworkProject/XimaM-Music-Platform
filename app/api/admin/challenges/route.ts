import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { listMusicChallenges, type ChallengeContentType, type ChallengeClubSlug } from '@/lib/musicChallenges';
import { getRemixSourceSummary } from '@/lib/remixServer';
import { getClipSourceSummary } from '@/lib/musicClips';

// Console admin "Defis musicaux" : reutilise music_challenges/challenge_entries
// (deja crees et verrouilles cote RLS) sans toucher a la logique publique des
// defis (lib/musicChallenges.ts n'est pas modifie par ces routes).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_CONTENT_TYPES: ChallengeContentType[] = ['clip', 'variation', 'track', 'open'];
const VALID_CLUB_SLUGS: ChallengeClubSlug[] = ['feedback', 'collab', 'remix', 'ai'];
const VALID_SOURCE_TYPES = ['track', 'ai_track'];

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'defi'
  );
}

async function uniqueChallengeId(contentType: string, title: string) {
  const base = `defi-${contentType}-${slugify(title)}`;
  for (let i = 0; i < 30; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await supabaseAdmin.from('music_challenges').select('id').eq('id', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function GET() {
  const guard = await getAdminGuard();
  if (!guard.userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (!guard.ok) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const challenges = await listMusicChallenges();
  return NextResponse.json({ challenges });
}

export async function POST(request: NextRequest) {
  const guard = await getAdminGuard();
  if (!guard.userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (!guard.ok) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  const title = String(body?.title || '').trim();
  const prompt = String(body?.prompt || '').trim();
  const contentType = String(body?.contentType || '').trim() as ChallengeContentType;
  const startsAtRaw = String(body?.startsAt || '').trim();
  const endsAtRaw = String(body?.endsAt || '').trim();

  if (!title) return NextResponse.json({ error: 'Titre requis.' }, { status: 400 });
  if (!prompt) return NextResponse.json({ error: 'Consigne requise.' }, { status: 400 });
  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Type invalide (clip, variation, track ou open)." }, { status: 400 });
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (!startsAtRaw || Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: 'Date de debut requise.' }, { status: 400 });
  if (!endsAtRaw || Number.isNaN(endsAt.getTime())) return NextResponse.json({ error: 'Date de fin requise.' }, { status: 400 });
  if (endsAt.getTime() <= startsAt.getTime()) {
    return NextResponse.json({ error: 'La date de fin doit etre apres la date de debut.' }, { status: 400 });
  }

  const sourceTrackId = String(body?.sourceTrackId || '').trim() || null;
  let sourceTrackType = String(body?.sourceTrackType || '').trim() || null;
  if (sourceTrackId) {
    if (!sourceTrackType) sourceTrackType = sourceTrackId.startsWith('ai-') ? 'ai_track' : 'track';
    if (!VALID_SOURCE_TYPES.includes(sourceTrackType)) {
      return NextResponse.json({ error: 'sourceTrackType doit etre "track" ou "ai_track".' }, { status: 400 });
    }

    // Revalide au moment de la creation que le morceau autorise reellement le
    // type de defi choisi - jamais de confiance dans un id fourni a l'aveugle.
    if (contentType === 'clip') {
      const source = await getClipSourceSummary({ sourceTrackId, sourceTrackType });
      if (!source) return NextResponse.json({ error: 'Morceau source introuvable.' }, { status: 404 });
      if (!source.allowClips || source.remixVisibility === 'disabled') {
        return NextResponse.json({ error: "Ce morceau n'autorise pas les Clips." }, { status: 400 });
      }
    } else if (contentType === 'variation') {
      const source = await getRemixSourceSummary({ sourceTrackId, sourceTrackType });
      if (!source) return NextResponse.json({ error: 'Morceau source introuvable.' }, { status: 404 });
      if (!source.allowAiVariation || source.remixVisibility === 'disabled') {
        return NextResponse.json({ error: "Ce morceau n'autorise pas les variations IA." }, { status: 400 });
      }
    }
  }

  const clubSlugRaw = String(body?.clubSlug || '').trim();
  const clubSlug = clubSlugRaw ? (clubSlugRaw as ChallengeClubSlug) : null;
  if (clubSlug && !VALID_CLUB_SLUGS.includes(clubSlug)) {
    return NextResponse.json({ error: 'Club invalide (feedback, collab, remix ou ai).' }, { status: 400 });
  }

  const accentColor = String(body?.accentColor || '').trim() || null;
  const coverUrl = String(body?.coverUrl || '').trim() || null;

  const id = await uniqueChallengeId(contentType, title);

  const { data, error } = await supabaseAdmin
    .from('music_challenges')
    .insert({
      id,
      title,
      prompt,
      content_type: contentType,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      accent_color: accentColor,
      cover_url: coverUrl,
      source_track_id: sourceTrackId,
      source_track_type: sourceTrackId ? sourceTrackType : null,
      club_slug: clubSlug,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Creation impossible.' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
