import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteFile } from '@/lib/cloudinary';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const trackId = params.id;
    const { data: track, error } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, generation_id, source_links, generation:ai_generations!inner(user_id)')
      .eq('id', trackId)
      .single();
    if (error || !track) {
      return NextResponse.json({ error: 'Track introuvable' }, { status: 404 });
    }

    if (String((track as any).generation?.user_id || '') !== String(session.user.id)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
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

function parseSourceLinks(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const trackId = params.id;
    const body = await request.json().catch(() => ({}));
    const hasFolder = Object.prototype.hasOwnProperty.call(body, 'libraryFolder');
    if (!hasFolder) {
      return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 });
    }

    const { data: track, error } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, source_links, generation:ai_generations!inner(user_id)')
      .eq('id', trackId)
      .single();

    if (error || !track) {
      return NextResponse.json({ error: 'Piste IA non trouvée' }, { status: 404 });
    }

    if (String((track as any).generation?.user_id || '') !== String(session.user.id)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const sourceLinks = parseSourceLinks((track as any).source_links);
    const libraryFolder = String(body.libraryFolder || '').trim();
    const nextSourceLinks = {
      ...sourceLinks,
      library_folder: libraryFolder || null,
      library_folder_updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from('ai_tracks')
      .update({ source_links: JSON.stringify(nextSourceLinks) })
      .eq('id', trackId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Erreur mise à jour' }, { status: 500 });
    }

    return NextResponse.json({ trackId, libraryFolder: libraryFolder || null, source_links: nextSourceLinks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur interne' }, { status: 500 });
  }
}

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

    const sourceLinks = parseSourceLinks(data.source_links);
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
      musicVideoUrl: data.music_video_url || sourceLinks.music_video_url || sourceLinks.musicVideoUrl || data.cover_video_url || sourceLinks.cover_video_url || null,
      musicVideoPosterUrl: data.music_video_poster_url || sourceLinks.music_video_poster_url || sourceLinks.musicVideoPosterUrl || data.cover_video_poster_url || sourceLinks.cover_video_poster_url || data.image_url || data.cover_url || null,
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

