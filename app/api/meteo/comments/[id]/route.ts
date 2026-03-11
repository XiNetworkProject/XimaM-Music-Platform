import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getTeamMember(userId: string) {
  const { data } = await supabaseAdmin
    .from('meteo_team_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  return data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const member = await getTeamMember(session.user.id);
    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs et modérateurs' }, { status: 403 });
    }

    const body = await request.json();
    const { is_hidden } = body as { is_hidden: boolean };

    if (typeof is_hidden !== 'boolean') {
      return NextResponse.json({ error: 'is_hidden (boolean) requis' }, { status: 400 });
    }

    const { data: comment, error } = await supabaseAdmin
      .from('meteo_comments')
      .update({ is_hidden, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du commentaire', details: error.message }, { status: 500 });
    }

    if (!comment) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Erreur API meteo/comments/[id] PATCH:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: comment } = await supabaseAdmin
      .from('meteo_comments')
      .select('id, user_id')
      .eq('id', params.id)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
    }

    const isAuthor = comment.user_id === session.user.id;

    if (!isAuthor) {
      const member = await getTeamMember(session.user.id);
      if (!member || !['admin', 'moderator'].includes(member.role)) {
        return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à supprimer ce commentaire' }, { status: 403 });
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('meteo_comments')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Erreur lors de la suppression', details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur API meteo/comments/[id] DELETE:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
