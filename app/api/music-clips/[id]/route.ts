import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import {
  MUSIC_CLIP_MAX_BYTES,
  MUSIC_CLIP_MAX_SECONDS,
  MUSIC_CLIP_MIN_SECONDS,
  assertCanCreateClip,
  clampClipDuration,
  cloudinaryVideoPosterUrl,
  formatMusicClips,
  sanitizeClipOffset,
  sanitizeClipTags,
} from '@/lib/musicClips';
import { notifyClipUsedSource } from '@/lib/notifications';

function cleanText(value: unknown, max = 280) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function isPlayableVideoUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return /^https?:$/i.test(url.protocol) && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

async function loadOwnClip(id: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('music_clips')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { error: NextResponse.json({ error: 'Clip introuvable' }, { status: 404 }) };
  if (String(data.creator_id) !== String(userId)) {
    return { error: NextResponse.json({ error: 'Non autorise' }, { status: 403 }) };
  }
  return { clip: data };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const loaded = await loadOwnClip(params.id, userId);
    if (loaded.error) return loaded.error;
    const existing = loaded.clip!;
    const body = await request.json().catch(() => ({}));
    const update: Record<string, any> = {};

    if (body.videoUrl !== undefined) {
      if (!isPlayableVideoUrl(body.videoUrl)) {
        return NextResponse.json({ error: 'La video doit etre un MP4, WebM, MOV ou M4V lisible' }, { status: 422 });
      }
      update.video_url = String(body.videoUrl).trim();
      update.poster_url = typeof body.posterUrl === 'string' && body.posterUrl.trim()
        ? body.posterUrl.trim()
        : cloudinaryVideoPosterUrl(update.video_url);
    }
    if (body.videoPublicId !== undefined) update.video_public_id = typeof body.videoPublicId === 'string' ? body.videoPublicId.trim() : null;
    if (body.posterUrl !== undefined && update.poster_url === undefined) update.poster_url = typeof body.posterUrl === 'string' && body.posterUrl.trim() ? body.posterUrl.trim() : null;
    if (body.caption !== undefined) update.caption = cleanText(body.caption);
    if (body.tags !== undefined) update.tags = sanitizeClipTags(body.tags);
    if (body.sourceTrackOffsetSeconds !== undefined) update.source_track_offset_seconds = sanitizeClipOffset(body.sourceTrackOffsetSeconds);
    if (body.sourceTrackDurationSeconds !== undefined) update.source_track_duration_seconds = clampClipDuration(body.sourceTrackDurationSeconds);

    const sourceDuration = update.source_track_duration_seconds ?? existing.source_track_duration_seconds;
    if (sourceDuration < MUSIC_CLIP_MIN_SECONDS || sourceDuration > MUSIC_CLIP_MAX_SECONDS) {
      return NextResponse.json({ error: 'Un clip doit durer entre 15 et 60 secondes' }, { status: 422 });
    }
    const bytes = Number(body.videoBytes || body.bytes || 0);
    if (Number.isFinite(bytes) && bytes > MUSIC_CLIP_MAX_BYTES) {
      return NextResponse.json({ error: 'La video depasse la limite de 95 Mo' }, { status: 422 });
    }
    const videoDuration = Number(body.videoDurationSeconds || body.videoDuration || 0);
    if (Number.isFinite(videoDuration) && videoDuration > 0 && (videoDuration < MUSIC_CLIP_MIN_SECONDS || videoDuration > MUSIC_CLIP_MAX_SECONDS)) {
      return NextResponse.json({ error: 'Un clip doit durer entre 15 et 60 secondes' }, { status: 422 });
    }

    let notifySourceOwnerId: string | null = null;
    let notifySourceTrackUrl = '';

    if (body.visibility !== undefined) {
      const nextVisibility = String(body.visibility);
      if (!['draft', 'published', 'hidden'].includes(nextVisibility)) {
        return NextResponse.json({ error: 'Visibilite invalide' }, { status: 422 });
      }
      if (nextVisibility === 'published') {
        const permission = await assertCanCreateClip({
          sourceTrackId: existing.source_track_id,
          sourceTrackType: existing.source_track_type,
          userId,
        });
        if (!permission.ok) return NextResponse.json({ error: permission.error }, { status: permission.status });
        const nextVideoUrl = update.video_url ?? existing.video_url;
        const nextPosterUrl = update.poster_url ?? existing.poster_url ?? cloudinaryVideoPosterUrl(nextVideoUrl);
        if (!isPlayableVideoUrl(nextVideoUrl)) {
          return NextResponse.json({ error: 'Ajoute une video lisible avant publication' }, { status: 422 });
        }
        if (!nextPosterUrl) {
          return NextResponse.json({ error: 'Miniature video introuvable' }, { status: 422 });
        }
        update.poster_url = nextPosterUrl;

        // Notifie le proprietaire du morceau source uniquement lors de la vraie
        // transition vers "publie" (pas a chaque edition ulterieure), et jamais
        // s'il s'agit de son propre morceau.
        if (existing.visibility !== 'published' && permission.source.artist._id && permission.source.artist._id !== userId) {
          notifySourceOwnerId = permission.source.artist._id;
          notifySourceTrackUrl = permission.source.trackUrl;
        }
      }
      update.visibility = nextVisibility;
    }

    const { data, error } = await supabaseAdmin
      .from('music_clips')
      .update(update)
      .eq('id', params.id)
      .select('*, creator:profiles!music_clips_creator_id_fkey(id, username, name, avatar)')
      .single();
    if (error) throw error;
    const [clip] = await formatMusicClips([data], { viewerId: userId });

    if (notifySourceOwnerId) {
      const creatorName = (data as any)?.creator?.name || (data as any)?.creator?.username || 'Quelqu\'un';
      notifyClipUsedSource(userId, notifySourceOwnerId, creatorName, params.id, notifySourceTrackUrl).catch((err) =>
        console.error('[notifications] clip_used_source failed', err),
      );
    }

    return NextResponse.json({ clip });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de modifier le clip' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });

    const loaded = await loadOwnClip(params.id, userId);
    if (loaded.error) return loaded.error;
    const existing = loaded.clip!;
    const { error } = await supabaseAdmin.from('music_clips').delete().eq('id', params.id);
    if (error) throw error;
    if (existing.video_public_id) {
      await cloudinary.uploader.destroy(existing.video_public_id, { resource_type: 'video' }).catch(() => null);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de supprimer le clip' }, { status: 500 });
  }
}
