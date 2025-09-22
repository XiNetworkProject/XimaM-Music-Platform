import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// GET /api/tracks/[id]/comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trackId = params.id;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'recent'; // 'top' | 'recent'

    // Radio: pas de commentaires
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({ success: true, comments: [], total: 0, limit, offset });
    }

    // Vérifier l'existence de la table comments
    const { error: tableError } = await supabase
      .from('comments')
      .select('id')
      .limit(1);

    if (tableError) {
      return NextResponse.json({ success: true, comments: [], total: 0, limit, offset });
    }

    let query = supabase
      .from('comments')
      .select('id, content, created_at, user_id, track_id, parent_id, likes')
      .eq('track_id', trackId);

    if (sort === 'top') {
      query = query.order('likes', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: comments, error } = await query.range(offset, offset + limit - 1);
    if (error) {
      return NextResponse.json({ error: 'Erreur récupération commentaires' }, { status: 500 });
    }

    const userIds = Array.from(new Set((comments || []).map(c => c.user_id)));
    let usersMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, name, avatar')
        .in('id', userIds);
      if (users) usersMap = new Map(users.map(u => [u.id, u]));
    }

    const formatted = (comments || []).map((c: any) => {
      const u = usersMap.get(c.user_id);
      return {
        // Compat UI Suno-like
        id: c.id,
        text: c.content,
        content: c.content,
        createdAt: c.created_at,
        likes: c.likes || 0,
        likesCount: c.likes || 0,
        isLiked: false,
        authorName: u?.name || u?.username || 'Utilisateur',
        avatar: u?.avatar || '',
        user: u ? { username: u.username, name: u.name || u.username, avatar: u.avatar } : undefined,
      };
    });

    return NextResponse.json({ success: true, comments: formatted, total: formatted.length, limit, offset });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// POST /api/tracks/[id]/comments
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const trackId = params.id;
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({ error: 'Commentaires non autorisés pour la radio' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const content = (body?.text || body?.content || '').toString().trim();
    if (!content) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        content,
        user_id: session.user.id,
        track_id: trackId,
        likes: 0,
        created_at: new Date().toISOString(),
      })
      .select('id, content, created_at, user_id')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erreur création commentaire' }, { status: 500 });
    }

    // Récupérer info user
    const { data: user } = await supabase
      .from('profiles')
      .select('id, username, name, avatar')
      .eq('id', session.user.id)
      .single();

    const comment = {
      id: data.id,
      text: data.content,
      content: data.content,
      createdAt: data.created_at,
      likes: 0,
      likesCount: 0,
      isLiked: false,
      authorName: user?.name || user?.username || 'Vous',
      avatar: user?.avatar || '',
      user: user ? { username: user.username, name: user.name || user.username, avatar: user.avatar } : undefined,
    };

    return NextResponse.json({ success: true, comment });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}


