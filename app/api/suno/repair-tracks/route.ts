import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { getRecordInfo } from '@/lib/suno';
import { normalizeSunoItem } from '@/lib/suno-normalize';
import { isLikelyExpiredAIProviderUrl } from '@/lib/media-url-health';
import { cacheSunoTrackMedia } from '@/lib/suno-media-cache';

type AnyTrack = {
  id: string;
  suno_id?: string | null;
  audio_url?: string | null;
  stream_audio_url?: string | null;
  image_url?: string | null;
  source_links?: string | null;
  created_at?: string | null;
};

type AnyGeneration = {
  id: string;
  task_id?: string | null;
  created_at?: string | null;
  tracks?: AnyTrack[];
};

const isHttp = (v?: string | null) => typeof v === 'string' && /^https?:\/\//i.test(v.trim());

const isDeadMediaHost = (url?: string | null, createdAt?: string | Date | null) => {
  if (!url) return true;
  return isLikelyExpiredAIProviderUrl(url, createdAt);
};

const pickValid = (candidates: Array<{ url?: string | null; createdAt?: string | Date | null }>) => {
  for (const candidate of candidates) {
    if (!isHttp(candidate.url)) continue;
    if (isDeadMediaHost(candidate.url, candidate.createdAt)) continue;
    return String(candidate.url).trim();
  }
  return '';
};

const parseSourceLinks = (value?: string | null) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(200, Number(body?.limit || 50)));

    const { data: generationsRaw, error: genErr } = await supabaseAdmin
      .from('ai_generations')
      .select('id, task_id, created_at, tracks:ai_tracks(id, suno_id, audio_url, stream_audio_url, image_url, source_links, created_at)')
      .eq('user_id', session.user.id)
      .not('task_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (genErr) {
      return NextResponse.json({ error: genErr.message }, { status: 500 });
    }

    const generations = (generationsRaw || []) as AnyGeneration[];
    let scanned = 0;
    let updatedTracks = 0;
    const errors: string[] = [];

    for (const generation of generations) {
      const taskId = String(generation.task_id || '').trim();
      if (!taskId) continue;
      scanned += 1;

      const existingTracks = Array.isArray(generation.tracks) ? generation.tracks : [];
      const needsRepair = existingTracks.some((t) => {
        const createdAt = t.created_at || generation.created_at || null;
        const audioBad = !isHttp(t.audio_url) || isDeadMediaHost(t.audio_url, createdAt);
        const streamBad = !isHttp(t.stream_audio_url) || isDeadMediaHost(t.stream_audio_url, createdAt);
        const imageBad = !isHttp(t.image_url) || isDeadMediaHost(t.image_url, createdAt);
        return audioBad || streamBad || imageBad;
      });

      if (!needsRepair) continue;

      try {
        const info = await getRecordInfo(taskId);
        const rawCandidates = [
          ...(Array.isArray(info?.data?.response?.sunoData) ? info.data.response.sunoData : []),
          ...(Array.isArray((info as any)?.data?.sunoData) ? (info as any).data.sunoData : []),
          ...(Array.isArray((info as any)?.data?.data) ? (info as any).data.data : []),
          ...(Array.isArray((info as any)?.data?.tracks) ? (info as any).data.tracks : []),
        ];

        const normalized = rawCandidates.map((item: any) => normalizeSunoItem(item));
        const bySunoId = new Map<string, ReturnType<typeof normalizeSunoItem>>();
        normalized.forEach((n) => {
          const k = String(n.id || '').trim();
          if (!k) return;
          bySunoId.set(k, n);
        });

        for (const dbTrack of existingTracks) {
          const sunoId = String(dbTrack.suno_id || '').trim();
          if (!sunoId) continue;
          const fresh = bySunoId.get(sunoId);
          if (!fresh) continue;

          const cachedMedia = await cacheSunoTrackMedia({
            generationId: generation.id,
            sunoId,
            audioUrl: fresh.audio,
            streamUrl: fresh.stream,
            imageUrl: fresh.image,
            existingAudioUrl: dbTrack.audio_url,
            existingImageUrl: dbTrack.image_url,
          });

          const existingCreatedAt = dbTrack.created_at || generation.created_at || null;
          const freshCreatedAt = new Date();
          const nextAudio = pickValid([
            { url: cachedMedia.audioUrl, createdAt: freshCreatedAt },
            { url: fresh.audio, createdAt: freshCreatedAt },
            { url: dbTrack.audio_url, createdAt: existingCreatedAt },
          ]);
          const nextStream = pickValid([
            { url: cachedMedia.streamUrl, createdAt: freshCreatedAt },
            { url: fresh.stream, createdAt: freshCreatedAt },
            { url: dbTrack.stream_audio_url, createdAt: existingCreatedAt },
          ]);
          const nextImage = pickValid([
            { url: cachedMedia.imageUrl, createdAt: freshCreatedAt },
            { url: fresh.image, createdAt: freshCreatedAt },
            { url: dbTrack.image_url, createdAt: existingCreatedAt },
          ]);

          const changed =
            nextAudio !== String(dbTrack.audio_url || '') ||
            nextStream !== String(dbTrack.stream_audio_url || '') ||
            nextImage !== String(dbTrack.image_url || '');
          const sourceLinks = {
            ...parseSourceLinks(dbTrack.source_links),
            ...cachedMedia.sourceLinksPatch,
          };

          if (!changed && !Object.keys(cachedMedia.sourceLinksPatch || {}).length) continue;

          const { error: updErr } = await supabaseAdmin
            .from('ai_tracks')
            .update({
              audio_url: nextAudio,
              stream_audio_url: nextStream,
              image_url: nextImage,
              source_links: JSON.stringify(sourceLinks),
            })
            .eq('id', dbTrack.id);

          if (updErr) {
            errors.push(`track ${dbTrack.id}: ${updErr.message}`);
            continue;
          }
          updatedTracks += 1;
        }
      } catch (e: any) {
        errors.push(`task ${taskId}: ${e?.message || 'repair error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      scannedGenerations: scanned,
      updatedTracks,
      errors: errors.slice(0, 30),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur repair tracks' }, { status: 500 });
  }
}
