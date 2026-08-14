import { isHttpUrl, isKnownTemporaryAIProviderUrl, isUsableHttpMediaUrl } from '@/lib/media-url-health';
import { storeRemoteMedia, type LocalMediaKind } from '@/lib/localMediaStorage';

type CacheInput = {
  generationId: string;
  sunoId: string;
  audioUrl?: string | null;
  streamUrl?: string | null;
  imageUrl?: string | null;
  existingAudioUrl?: string | null;
  existingImageUrl?: string | null;
};

export type CachedSunoMedia = {
  audioUrl: string;
  streamUrl: string;
  imageUrl: string;
  sourceLinksPatch: Record<string, unknown>;
};

function isTemporaryHttpUrl(url?: string | null) {
  return isHttpUrl(url) && isKnownTemporaryAIProviderUrl(url);
}

function pickProviderOrDurable(url?: string | null) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (isTemporaryHttpUrl(trimmed)) return trimmed;
  if (isUsableHttpMediaUrl(trimmed)) return trimmed;
  return '';
}

async function cacheRemoteMedia(
  url: string,
  kind: LocalMediaKind,
): Promise<{ secureUrl: string; publicId: string } | null> {
  if (!isHttpUrl(url)) return null;
  try {
    const result = await storeRemoteMedia(url, kind);
    return { secureUrl: result.secure_url, publicId: result.public_id };
  } catch (error) {
    let host = 'unknown';
    try {
      host = new URL(url).hostname;
    } catch {}
    console.warn('Suno media cache failed:', {
      kind,
      host,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function uploadFirstRemoteMedia(
  urls: Array<string | null | undefined>,
  kind: LocalMediaKind,
): Promise<{ secureUrl: string; publicId: string } | null> {
  const tried = new Set<string>();
  for (const url of urls) {
    const trimmed = (url || '').trim();
    if (!trimmed || tried.has(trimmed)) continue;
    tried.add(trimmed);
    const uploaded = await cacheRemoteMedia(trimmed, kind);
    if (uploaded) return uploaded;
  }
  return null;
}

export async function cacheSunoTrackMedia(input: CacheInput): Promise<CachedSunoMedia> {
  const sourceAudioUrl = (input.audioUrl || '').trim();
  const sourceStreamUrl = (input.streamUrl || '').trim();
  const sourceImageUrl = (input.imageUrl || '').trim();
  const refreshedAt = sourceAudioUrl || sourceStreamUrl || sourceImageUrl ? new Date().toISOString() : null;

  const existingAudioIsDurable = isUsableHttpMediaUrl(input.existingAudioUrl);
  const existingImageIsDurable = isUsableHttpMediaUrl(input.existingImageUrl);

  const cachedAudio = existingAudioIsDurable
    ? null
    : await uploadFirstRemoteMedia([sourceAudioUrl, sourceStreamUrl], 'ai-audio');
  const cachedImage = existingImageIsDurable
    ? null
    : await uploadFirstRemoteMedia([sourceImageUrl], 'ai-cover');

  const audioUrl =
    (existingAudioIsDurable ? String(input.existingAudioUrl).trim() : '') ||
    cachedAudio?.secureUrl ||
    pickProviderOrDurable(sourceAudioUrl);
  const streamUrl =
    cachedAudio?.secureUrl ||
    pickProviderOrDurable(sourceStreamUrl) ||
    audioUrl;
  const imageUrl =
    (existingImageIsDurable ? String(input.existingImageUrl).trim() : '') ||
    cachedImage?.secureUrl ||
    pickProviderOrDurable(sourceImageUrl);

  return {
    audioUrl,
    streamUrl,
    imageUrl,
    sourceLinksPatch: {
      provider_audio_url: sourceAudioUrl || null,
      provider_stream_audio_url: sourceStreamUrl || null,
      provider_image_url: sourceImageUrl || null,
      provider_urls_refreshed_at: refreshedAt,
      local_audio_public_id: cachedAudio?.publicId || null,
      local_image_public_id: cachedImage?.publicId || null,
      media_storage: cachedAudio || cachedImage ? 'local' : null,
      media_cached_at: cachedAudio || cachedImage ? refreshedAt : null,
    },
  };
}
