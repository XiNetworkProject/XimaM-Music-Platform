import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/tracks/[id]/comments/[commentId]/moderation
// Actions: delete, favorite, filter, unfilter
export async function POST(request: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const trackId = params.id;
  const commentId = params.commentId;
  if (!trackId || !commentId) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '').trim();
  const reason = body?.reason ? String(body.reason).trim() : null;
  if (!action) return NextResponse.json({ error: 'Action manquante' }, { status: 400 });

  // Vérifier que l'utilisateur est le créateur du track
  const { data: track } = await supabaseAdmin.from('tracks').select('id, creator_id').eq('id', trackId).maybeSingle();
  if (!track) return NextResponse.json({ error: 'Piste introuvable' }, { status: 404 });
  if ((track as any).creator_id !== userId) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  // Charger l'état actuel
  let current: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('comment_moderation')
      .select('*')
      .eq('comment_id', commentId)
      .eq('track_id', trackId)
      .maybeSingle();
    current = data;
  } catch {
    return NextResponse.json({ error: 'Système de modération non disponible' }, { status: 500 });
  }

  const patch: any = {
    comment_id: commentId,
    track_id: trackId,
    creator_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (action === 'delete') {
    patch.is_deleted = true;
    patch.deletion_reason = reason || 'creator';
    patch.deleted_at = new Date().toISOString();
  } else if (action === 'favorite') {
    patch.is_creator_favorite = !current?.is_creator_favorite;
    patch.creator_favorite_at = patch.is_creator_favorite ? new Date().toISOString() : null;
  } else if (action === 'filter') {
    patch.is_filtered = true;
    patch.filter_reason = reason || 'creator';
    patch.filtered_at = new Date().toISOString();
  } else if (action === 'unfilter') {
    patch.is_filtered = false;
    patch.filter_reason = null;
    patch.filtered_at = null;
  } else {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('comment_moderation').upsert(patch);
  if (error) return NextResponse.json({ error: 'Impossible de modérer' }, { status: 500 });

  return NextResponse.json({ success: true });
}

