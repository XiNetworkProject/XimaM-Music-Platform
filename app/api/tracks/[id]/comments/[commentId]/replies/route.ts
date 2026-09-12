import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { canViewTrack } from '@/lib/publicTracks';
import contentModerator from '@/lib/contentModeration';

// POST /api/tracks/[id]/comments/[commentId]/replies - ajouter une réponse
export async function POST(request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getApiSession(request).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const trackId = params.id;
  const parentId = params.commentId;
  if (!trackId || !parentId) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const content = String(body?.content || '').trim();
  if (!content || content.length > 1000) return NextResponse.json({ error: 'Réponse invalide' }, { status: 400 });
  const { data: track } = await dbAdmin.from('tracks').select('id, creator_id, is_public, audio_url').eq('id', params.id).maybeSingle();
  if (!track || !canViewTrack(track, userId)) return NextResponse.json({ error: 'Morceau introuvable' }, { status: 404 });
  const { data: parent } = await dbAdmin.from('comments').select('id').eq('id', parentId).eq('track_id', trackId).is('parent_id', null).maybeSingle();
  if (!parent) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });

  const mod = contentModerator.analyzeContent(content);
  if (!mod.isClean) {
    return NextResponse.json({ error: 'Contenu refusé', details: mod }, { status: 400 });
  }

  const { data: inserted, error } = await dbAdmin
    .from('comments')
    .insert({ track_id: trackId, user_id: userId, content, parent_id: parentId })
    .select('id, content, created_at, updated_at, user_id')
    .single();

  if (error || !inserted) return NextResponse.json({ error: 'Impossible de publier' }, { status: 500 });

  const { data: user } = await dbAdmin.from('profiles').select('id, username, name, avatar').eq('id', userId).maybeSingle();

  return NextResponse.json({
    reply: {
      id: inserted.id,
      content: inserted.content,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
      likes: [],
      likesCount: 0,
      isLiked: false,
      user: {
        id: userId,
        username: (user as any)?.username || 'Utilisateur',
        name: (user as any)?.name || (user as any)?.username || 'Utilisateur',
        avatar: (user as any)?.avatar || '',
      },
    },
  });
}

export const dynamic = 'force-dynamic';
