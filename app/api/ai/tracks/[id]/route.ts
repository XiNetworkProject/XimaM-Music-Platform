import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin, createDatabaseClient } from '@/lib/database';
import { withDatabaseTransaction } from '@/lib/postgres';
import { deleteLocalMedia, isLocalMediaOwnedBy, isLocalMediaReference } from '@/lib/localMediaStorage';
import { canViewAiTrack } from '@/lib/publicTracks';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

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
    const { data: track, error } = await dbAdmin
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

    // Seuls les nouveaux fichiers locaux sont supprimes pendant la transition.
    try {
      if (track.source_links) {
        const links = JSON.parse(track.source_links);
        if (links?.local_media_public_id) {
          await deleteLocalMedia(links.local_media_public_id);
        }
      }
    } catch (e) {
      console.warn('Suppression media local echouee (continuation):', (e as any)?.message);
    }

    await dbAdmin.from('ai_tracks').delete().eq('id', trackId);

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
    const originError = rejectUntrustedMutationOrigin(request);
    if (originError) return originError;
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const trackId = params.id;
    const limited = enforceRequestRateLimit(request, 'ai-track-edit', 40, 60_000, session.user.id);
    if (limited) return limited;
    const parsed = await readLimitedJson<any>(request, 12 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Modification invalide' }, { status: 400 });
    const hasFolder = Object.prototype.hasOwnProperty.call(body, 'libraryFolder');
    const hasTitle = Object.prototype.hasOwnProperty.call(body, 'title');
    const hasCover = Object.prototype.hasOwnProperty.call(body, 'coverUrl');
    if (!hasFolder && !hasTitle && !hasCover) {
      return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 });
    }
    if ((hasTitle && (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 160 || /[\u0000-\u001f]/.test(body.title))) ||
        (hasFolder && body.libraryFolder !== null && (typeof body.libraryFolder !== 'string' || body.libraryFolder.length > 80 || /[\u0000-\u001f]/.test(body.libraryFolder)))) {
      return NextResponse.json({ error: 'Titre ou dossier invalide' }, { status: 400 });
    }
    if (hasCover && (!isLocalMediaOwnedBy(body.coverPublicId, session.user.id) || !isLocalMediaReference(body.coverUrl, body.coverPublicId, 'ai-cover'))) {
      return NextResponse.json({ error: 'Importez une pochette depuis votre compte' }, { status: 400 });
    }

    const { data: track, error } = await dbAdmin
      .from('ai_tracks')
      .select('id, generation_id, source_links, generation:ai_generations!inner(user_id)')
      .eq('id', trackId)
      .single();

    if (error || !track) {
      return NextResponse.json({ error: 'Piste IA non trouvée' }, { status: 404 });
    }

    if (String((track as any).generation?.user_id || '') !== String(session.user.id)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const result = await withDatabaseTransaction(async client => {
      // Same short lock as callback persistence: artist edits cannot be lost.
      const locked = await client.query('SELECT id FROM ai_generations WHERE id = $1 AND user_id = $2 FOR UPDATE', [track.generation_id, session.user.id]);
      if (!locked.rowCount) throw new Error('Génération introuvable');
      const database = createDatabaseClient(client);
      const fresh = await database.from('ai_tracks').select('source_links').eq('id', trackId).single();
      if (fresh.error || !fresh.data) throw new Error('Piste introuvable');
      const links = parseSourceLinks(fresh.data.source_links);
      const patch: Record<string, unknown> = {};
      const now = new Date().toISOString();
      if (hasFolder) { links.library_folder = body.libraryFolder?.trim() || null; links.library_folder_updated_at = now; }
      if (hasTitle) { patch.title = body.title.trim(); links.artist_title_edited_at = now; }
      if (hasCover) { patch.image_url = body.coverUrl; links.artist_cover_edited_at = now; links.artist_cover_public_id = body.coverPublicId; }
      patch.source_links = JSON.stringify(links);
      const updated = await database.from('ai_tracks').update(patch).eq('id', trackId);
      if (updated.error) throw new Error('Impossible de modifier la piste');
      return { trackId, ...patch, libraryFolder: links.library_folder || null, source_links: links };
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: 'Impossible de modifier le morceau. Réessayez.' }, { status: 500 });
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

    const { data, error } = await dbAdmin
      .from('ai_tracks')
      .select('*, generation:ai_generations!inner(user_id, is_public, status, is_trashed)')
      .eq('id', id)
      .single();

    const session = await getApiSession(request).catch(() => null);
    if (error || !data || !canViewAiTrack(data, session?.user?.id)) {
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
      visualUrl: sourceLinks.visual_url || sourceLinks.visualUrl || null,
      visualType: sourceLinks.visual_type || sourceLinks.visualType || null,
      dominantColors: Array.isArray(sourceLinks.dominant_colors) ? sourceLinks.dominant_colors : Array.isArray(sourceLinks.dominantColors) ? sourceLinks.dominantColors : [],
      auraVisualEnabled: sourceLinks.aura_visual_enabled !== false && sourceLinks.auraVisualEnabled !== false,
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
