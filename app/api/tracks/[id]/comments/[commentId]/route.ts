import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import contentModerator from '@/lib/contentModeration';

// PUT /api/tracks/[id]/comments/[commentId] - modifier (propriétaire)
export async function PUT(request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const commentId = params.commentId;
  if (!commentId) return NextResponse.json({ error: 'CommentId manquant' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const content = String(body?.content || '').trim();
  if (!content) return NextResponse.json({ error: 'Contenu vide' }, { status: 400 });

  const mod = contentModerator.analyzeContent(content);
  if (!mod.isClean) return NextResponse.json({ error: 'Contenu refusé', details: mod }, { status: 400 });

  // Vérifier ownership
  const { data: existing, error: exErr } = await supabaseAdmin
    .from('comments')
    .select('id, user_id')
    .eq('id', commentId)
    .maybeSingle();
  if (exErr || !existing) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
  if ((existing as any).user_id !== userId) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const { data: updated, error } = await supabaseAdmin
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select('id, content, created_at, updated_at, user_id')
    .single();

  if (error || !updated) return NextResponse.json({ error: 'Impossible de modifier' }, { status: 500 });

  const { data: user } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').eq('id', userId).maybeSingle();

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
export async function DELETE(_request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const trackId = params.id;
  const commentId = params.commentId;
  if (!trackId || !commentId) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

  const { data: existing, error: exErr } = await supabaseAdmin
    .from('comments')
    .select('id, user_id, track_id')
    .eq('id', commentId)
    .maybeSingle();
  if (exErr || !existing) return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
  if ((existing as any).user_id !== userId) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  // Soft-delete via table de modération si possible, sinon delete hard
  try {
    await supabaseAdmin.from('comment_moderation').upsert({
      comment_id: commentId,
      track_id: trackId,
      creator_id: userId,
      is_deleted: true,
      deletion_reason: 'owner',
      deleted_at: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch {
    await supabaseAdmin.from('comments').delete().eq('id', commentId);
    return NextResponse.json({ success: true });
  }
}

