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
    if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam') {
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
      console.error('likes GET: erreur lecture likeRow', likeErr);
    }

    // Récupérer le compteur depuis track_stats (créé par triggers)
    const { data: stats, error: statsErr } = await supabaseAdmin
      .from('track_stats')
      .select('likes_count')
      .eq('track_id', trackId)
      .maybeSingle();

    let likesCount = stats?.likes_count ?? 0;
    if (statsErr || stats == null) {
      // Fallback: compter directement les likes si stats indisponible
      console.warn('likes GET: stats indisponible, fallback count', statsErr);
      const { count, error: countErr } = await supabaseAdmin
        .from('track_likes')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId);
      if (countErr) {
        console.error('likes GET: erreur fallback count', countErr);
      }
      likesCount = typeof count === 'number' ? count : 0;
    }

    return NextResponse.json({ liked: !!likeRow, likesCount });

  } catch (error) {
    console.error('❌ Erreur vérification like:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

// POST /api/tracks/[id]/like - Ajouter le like
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    
    console.log('POST like - Session:', { hasSession: !!session, userId, trackId: params.id });
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const trackId = params.id;

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam') {
      return NextResponse.json({
        success: false,
        isLiked: false,
        likesCount: 0,
        message: 'Radio - pas de likes'
      });
    }

    // Ajouter le like
    console.log('POST like - Tentative d\'insertion:', { trackId, userId });
    
    const { data: insertedData, error: insErr } = await supabaseAdmin
      .from('track_likes')
      .insert({ track_id: trackId, user_id: userId })
      .select();
    
    console.log('POST like - Résultat insertion:', { insertedData, insErr });
    
    if (insErr) {
      // Conflit unique = déjà liké (ignore silencieusement)
      if (insErr.code !== '23505') {
        console.error('likes POST: erreur insertion like', insErr);
        return NextResponse.json({ error: 'Erreur ajout like' }, { status: 500 });
      } else {
        console.log('POST like - Like déjà existant (conflit ignoré)');
      }
    }

    // Log event like
    const { error: evErr } = await supabaseAdmin.from('track_events').insert({
      track_id: trackId,
      user_id: userId,
      event_type: 'like',
      platform: 'web',
      is_ai_track: trackId?.startsWith('ai-') || false,
    });
    
    if (evErr) {
      console.warn('like insert: log event error', evErr);
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

    if (likeErr) {
      console.error('likes POST: erreur lecture likeRow final', likeErr);
    }

    let likesCount = stats?.likes_count ?? 0;
    if (statsErr || stats == null) {
      console.warn('likes POST: stats indisponible, fallback count', statsErr);
      const { count, error: countErr } = await supabaseAdmin
        .from('track_likes')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId);
      if (countErr) {
        console.error('likes POST: erreur fallback count', countErr);
      }
      likesCount = typeof count === 'number' ? count : likesCount;
    }

    console.log('POST like - Succès:', { isLiked: !!likeRow, likesCount });
    return NextResponse.json({ success: true, isLiked: !!likeRow, likesCount });

  } catch (error) {
    console.error('❌ Erreur ajout like:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

// DELETE /api/tracks/[id]/like - Retirer le like
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    
    console.log('DELETE like - Session:', { hasSession: !!session, userId, trackId: params.id });
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const trackId = params.id;

    // Gestion spéciale pour la radio
    if (trackId === 'radio-mixx-party') {
      return NextResponse.json({
        success: false,
        isLiked: false,
        likesCount: 0,
        message: 'Radio - pas de likes'
      });
    }

    // Supprimer le like s'il existe
    console.log('DELETE like - Tentative de suppression:', { trackId, userId });
    
    const { data: deletedData, error: delErr } = await supabaseAdmin
      .from('track_likes')
      .delete()
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .select();

    console.log('DELETE like - Résultat:', { deletedData, delErr });

    if (delErr) {
      console.error('likes DELETE: erreur suppression like', delErr);
      return NextResponse.json({ error: 'Erreur suppression like' }, { status: 500 });
    }

    // Log event unlike
    const { error: evErr } = await supabaseAdmin.from('track_events').insert({
      track_id: trackId,
      user_id: userId,
      event_type: 'unlike',
      platform: 'web',
      is_ai_track: trackId?.startsWith('ai-') || false,
    });
    
    if (evErr) {
      console.warn('like unlike: log event error', evErr);
    }

    // Récupérer le compteur mis à jour
    const { data: stats, error: statsErr } = await supabaseAdmin
      .from('track_stats')
      .select('likes_count')
      .eq('track_id', trackId)
      .maybeSingle();

    let likesCount = stats?.likes_count ?? 0;
    if (statsErr || stats == null) {
      const { count, error: countErr } = await supabaseAdmin
        .from('track_likes')
        .select('*', { count: 'exact', head: true })
        .eq('track_id', trackId);
      if (countErr) {
        console.error('likes DELETE: erreur fallback count', countErr);
      }
      likesCount = typeof count === 'number' ? count : 0;
    }

    console.log('DELETE like - Succès:', { likesCount, isLiked: false });
    return NextResponse.json({ success: true, isLiked: false, likesCount });

  } catch (error) {
    console.error('❌ Erreur suppression like:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
