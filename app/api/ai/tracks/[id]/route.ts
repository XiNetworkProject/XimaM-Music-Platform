import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteFile } from '@/lib/cloudinary';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const trackId = params.id;
    const { data: track, error } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, generation_id, source_links')
      .eq('id', trackId)
      .single();
    if (error || !track) {
      return NextResponse.json({ error: 'Track introuvable' }, { status: 404 });
    }

    // Supprimer du Cloudinary si on a un public_id
    try {
      if (track.source_links) {
        const links = JSON.parse(track.source_links);
        if (links?.cloudinary_public_id) {
          await deleteFile(links.cloudinary_public_id, 'video');
        }
      }
    } catch (e) {
      console.warn('⚠️ Suppression Cloudinary échouée (continuation):', (e as any)?.message);
    }

    await supabaseAdmin.from('ai_tracks').delete().eq('id', trackId);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('❌ Erreur suppression track:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

// (imports dupliqués supprimés)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('ai_tracks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Piste IA non trouvée' }, { status: 404 });
    }

    const formatted = {
      _id: `ai-${data.id}`,
      title: data.title || 'Titre inconnu',
      artist: {
        _id: data.user_id || 'ai',
        name: data.artist_name || data.username || 'Synaura IA',
        username: data.username || 'synaura-ia',
        avatar: data.artist_avatar || null,
      },
      audioUrl: data.audio_url,
      coverUrl: data.image_url || data.cover_url || null,
      duration: data.duration || 0,
      likes: [],
      comments: [],
      plays: data.play_count || 0,
      genre: [],
      isLiked: false,
    };

    return NextResponse.json(formatted);
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


