import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import contentModerator from '@/lib/contentModeration';

// PUT /api/tracks/[id]/comments/[commentId] - modifier (propriétaire)
export async function PUT(request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getApiSession(request).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const commentId = params.commentId;
  if (!commentId) return NextResponse.json({ error: 'CommentId manquant' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const content = String(body?.content || '').trim();
  if (!content || content.length > 1000) return NextResponse.json({ error: 'Contenu invalide' }, { status: 400 });

  const mod = contentModerator.analyzeContent(content);
  if (!mod.isClean) return NextResponse.json({ error: 'Contenu refusé', details: mod }, { status: 400 });

  // Vérifier ownership
  const { data: existing, error: exErr } = await dbAdmin
    .from('comments')
    .select('id, user_id')
    .eq('id', commentId)
    .eq('track_id', params.id)
    .maybeSingle();
  if (exErr || !existing) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
  if ((existing as any).user_id !== userId) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const { data: updated, error } = await dbAdmin
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select('id, content, created_at, updated_at, user_id')
    .single();

  if (error || !updated) return NextResponse.json({ error: 'Impossible de modifier' }, { status: 500 });

  const { data: user } = await dbAdmin.from('profiles').select('id, username, name, avatar').eq('id', userId).maybeSingle();

  return NextResponse.json({
    comment: {
      id: updated.id,
      content: updated.content,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
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

// DELETE /api/tracks/[id]/comments/[commentId] - supprimer (propriétaire)
export async function DELETE(request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getApiSession(request).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const trackId = params.id;
  const commentId = params.commentId;
  if (!trackId || !commentId) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

  const { data: existing, error: exErr } = await dbAdmin
    .from('comments')
    .select('id, user_id, track_id')
    .eq('id', commentId)
    .eq('track_id', trackId)
    .maybeSingle();
  if (exErr || !existing) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
  if ((existing as any).user_id !== userId) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  // A failed soft delete must never be reported as successful or become a hard delete.
  try {
    const { error } = await dbAdmin.from('comment_moderation').upsert({
      comment_id: commentId,
      track_id: trackId,
      creator_id: userId,
      is_deleted: true,
      deletion_reason: 'owner',
      deleted_at: new Date().toISOString(),
    }, { onConflict: 'comment_id,creator_id' });
    if (error) return NextResponse.json({ error: 'Impossible de supprimer' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Impossible de supprimer' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
