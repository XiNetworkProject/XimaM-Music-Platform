import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import contentModerator from '@/lib/contentModeration';
import { notifyNewComment } from '@/lib/notifications';
import { GET as readModeratedComments } from './moderation/route';
import { canViewTrack } from '@/lib/publicTracks';

// GET /api/tracks/[id]/comments - liste publique (filtrée) des commentaires
// POST /api/tracks/[id]/comments - ajouter un commentaire (avec modération)
export const GET = readModeratedComments;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const trackId = params.id;
    if (!trackId) return NextResponse.json({ error: 'TrackId manquant' }, { status: 400 });
    if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam' || trackId.startsWith('ai-')) {
      return NextResponse.json({ error: 'Commentaires non disponibles' }, { status: 400 });
    }

    const { data: target } = await dbAdmin.from('tracks').select('id, creator_id, is_public, audio_url, duration').eq('id', trackId).maybeSingle();
    if (!target || !canViewTrack(target, userId)) return NextResponse.json({ error: 'Morceau introuvable' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const content = String(body?.content || '').trim();
    if (!content || content.length > 1000) return NextResponse.json({ error: 'Commentaire vide' }, { status: 400 });

    // Commentaire ancré à un instant précis du morceau (waveform) : optionnel,
    // null pour un commentaire classique. Jamais de confiance dans une valeur
    // négative ou non finie envoyée par le client.
    const timestampRaw = body?.timestampSeconds;
    const timestampSeconds =
      timestampRaw != null && Number.isFinite(Number(timestampRaw)) && Number(timestampRaw) >= 0
        ? Number(timestampRaw)
        : null;

    if (timestampSeconds != null && Number(target.duration) > 0 && timestampSeconds > Number(target.duration)) return NextResponse.json({ error: 'Instant hors du morceau' }, { status: 400 });

    const mod = contentModerator.analyzeContent(content);
    if (!mod.isClean) {
      return NextResponse.json({ error: 'Contenu refusé', details: mod }, { status: 400 });
    }

    // Some older schemas still have a NOT NULL column named "text" instead of "content".
    // We try a normal insert first, then retry with "text" if needed.
    let inserted: any = null;
    let error: any = null;

    const attempt1 = await dbAdmin
      .from('comments')
      .insert({ track_id: trackId, user_id: userId, content, timestamp_seconds: timestampSeconds })
      .select('*')
      .single();

    inserted = attempt1.data;
    error = attempt1.error;

    const msg1 = (error as any)?.message || '';
    const needsTextRetry =
      msg1.includes('null value in column') && msg1.includes('relation "comments"') && msg1.includes('column "text"');

    if (needsTextRetry) {
      const attempt2 = await dbAdmin
        .from('comments')
        .insert({ track_id: trackId, user_id: userId, content, text: content, timestamp_seconds: timestampSeconds } as any)
        .select('*')
        .single();
      inserted = attempt2.data;
      error = attempt2.error;
    }

    if (error || !inserted) {
      const errAny = error as any;
      const msg = errAny?.message || 'Impossible de publier';
      const isMissingCommentsTable =
        (msg.includes('relation') && msg.includes('comments') && msg.includes('does not exist')) ||
        (msg.includes('relation') && msg.includes('public.comments') && msg.includes('does not exist'));

      const normalized =
        isMissingCommentsTable
          ? 'Table public.comments manquante (exécute le script SQL de commentaires).'
          : msg.includes('invalid input syntax for type uuid')
            ? 'Schéma DB incompatible: comments.track_id est en UUID mais tes tracks id sont en texte (track_...). Rejoue le script SQL (version track_id TEXT) puis reload schema.'
            : msg.includes('null value in column') && msg.includes('relation "comments"') && msg.includes('column "text"')
              ? 'Schéma DB incompatible: la table comments utilise une colonne NOT NULL nommée "text" au lieu de "content". Rejoue le script SQL (migration rename text→content) puis reload schema.'
            : msg;

      return NextResponse.json(
        {
          error: normalized,
          db: {
            code: errAny?.code || null,
            details: errAny?.details || null,
            hint: errAny?.hint || null,
            message: errAny?.message || null,
          },
        },
        { status: 500 },
      );
    }

    const { data: user } = await dbAdmin
      .from('profiles')
      .select('id, username, name, avatar')
      .eq('id', userId)
      .maybeSingle();

    try {
      const { data: track } = await dbAdmin
        .from('tracks')
        .select('title, creator_id')
        .eq('id', trackId)
        .maybeSingle();
      if (track && track.creator_id && track.creator_id !== userId) {
        const commenterName = (user as any)?.name || (user as any)?.username || 'Quelqu\'un';
        notifyNewComment(userId, track.creator_id, commenterName, track.title, trackId).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      comment: {
        id: inserted.id,
        content: inserted.content ?? inserted.text ?? content,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
        timestampSeconds: inserted.timestamp_seconds != null ? Number(inserted.timestamp_seconds) : null,
        likes: [],
        likesCount: 0,
        isLiked: false,
        user: {
          id: userId,
          username: (user as any)?.username || 'Utilisateur',
          name: (user as any)?.name || (user as any)?.username || 'Utilisateur',
          avatar: (user as any)?.avatar || '',
        },
        replies: [],
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'Erreur interne (comments POST)',
        message: e?.message || String(e),
      },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
