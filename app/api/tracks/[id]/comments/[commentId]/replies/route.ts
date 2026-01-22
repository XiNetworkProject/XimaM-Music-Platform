import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import contentModerator from '@/lib/contentModeration';

// POST /api/tracks/[id]/comments/[commentId]/replies - ajouter une réponse
export async function POST(request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const trackId = params.id;
  const parentId = params.commentId;
  if (!trackId || !parentId) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const content = String(body?.content || '').trim();
  if (!content) return NextResponse.json({ error: 'Réponse vide' }, { status: 400 });

  const mod = contentModerator.analyzeContent(content);
  if (!mod.isClean) {
    return NextResponse.json({ error: 'Contenu refusé', details: mod }, { status: 400 });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('comments')
    .insert({ track_id: trackId, user_id: userId, content, parent_id: parentId })
    .select('id, content, created_at, updated_at, user_id')
    .single();

  if (error || !inserted) return NextResponse.json({ error: 'Impossible de publier' }, { status: 500 });

  const { data: user } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').eq('id', userId).maybeSingle();

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

