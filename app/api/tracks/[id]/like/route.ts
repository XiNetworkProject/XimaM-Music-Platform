import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/tracks/[id]/like - Vérifier l'état du like (version simplifiée)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const trackId = params.id;
    const userId = session.user.id;

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({
        liked: false,
        likesCount: 0,
        message: 'Radio - pas de likes'
      });
    }

    // Vérifier si l'utilisateur a liké
    const { data: likeRow, error: likeErr } = await supabaseAdmin
      .from('track_likes')
      .select('id')
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .maybeSingle();

    if (likeErr) {
      return NextResponse.json({ error: 'Erreur lecture like' }, { status: 500 });
    }

    // Récupérer le compteur depuis track_stats (créé par triggers)
    const { data: stats, error: statsErr } = await supabaseAdmin
      .from('track_stats')
      .select('likes_count')
      .eq('track_id', trackId)
      .maybeSingle();

    if (statsErr) {
      return NextResponse.json({ error: 'Erreur lecture stats' }, { status: 500 });
    }

    return NextResponse.json({
      liked: !!likeRow,
      likesCount: stats?.likes_count ?? 0
    });

  } catch (error) {
    console.error('❌ Erreur vérification like:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

// POST /api/tracks/[id]/like - Basculer le like (version simplifiée)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const trackId = params.id;
    const userId = session.user.id;

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({
        success: false,
        isLiked: false,
        likesCount: 0,
        message: 'Radio - pas de likes'
      });
    }

    // Toggle like: si existe -> delete, sinon -> insert
    const { data: existing, error: exErr } = await supabaseAdmin
      .from('track_likes')
      .select('id')
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ error: 'Erreur lecture like' }, { status: 500 });
    }

    if (existing) {
      const { error: delErr } = await supabaseAdmin
        .from('track_likes')
        .delete()
        .eq('id', existing.id);
      if (delErr) {
        return NextResponse.json({ error: 'Erreur suppression like' }, { status: 500 });
      }
    } else {
      const { error: insErr } = await supabaseAdmin
        .from('track_likes')
        .insert({ track_id: trackId, user_id: userId });
      if (insErr) {
        // Conflit unique = déjà liké ailleurs en concurrence
        if (insErr.code !== '23505') {
          return NextResponse.json({ error: 'Erreur ajout like' }, { status: 500 });
        }
      }
    }

    // Lire état final
    const { data: likeRow, error: likeErr } = await supabaseAdmin
      .from('track_likes')
      .select('id')
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .maybeSingle();

    const { data: stats, error: statsErr } = await supabaseAdmin
      .from('track_stats')
      .select('likes_count')
      .eq('track_id', trackId)
      .maybeSingle();

    if (likeErr || statsErr) {
      return NextResponse.json({ error: 'Erreur lecture état final' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      isLiked: !!likeRow,
      likesCount: stats?.likes_count ?? 0
    });

  } catch (error) {
    console.error('❌ Erreur toggle like:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
