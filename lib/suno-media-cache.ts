import cloudinary from '@/lib/cloudinary';
import { isHttpUrl, isKnownTemporaryAIProviderUrl, isUsableHttpMediaUrl } from '@/lib/media-url-health';

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

function hasCloudinaryConfig() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function isCloudinaryUrl(url?: string | null) {
  if (!url) return false;
  try {
    return new URL(url).hostname.toLowerCase().includes('cloudinary.com');
  } catch {
    return false;
  }
}

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

function publicIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'media';
}

async function uploadRemoteMedia(
  url: string,
  resourceType: 'image' | 'video',
  publicId: string
): Promise<{ secureUrl: string; publicId: string } | null> {
  if (!hasCloudinaryConfig() || !isHttpUrl(url) || isCloudinaryUrl(url)) return null;
  try {
    const result = await cloudinary.uploader.upload(url, {
      resource_type: resourceType,
      folder: resourceType === 'video' ? 'synaura/ai-audio' : 'synaura/ai-covers',
      public_id: publicId,
      overwrite: true,
      unique_filename: false,
    });
    return { secureUrl: result.secure_url, publicId: result.public_id };
  } catch (error) {
    let host = 'unknown';
    try {
      host = new URL(url).hostname;
    } catch {}
    console.warn('Suno media cache failed:', {
      resourceType,
      host,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function uploadFirstRemoteMedia(
  urls: Array<string | null | undefined>,
  resourceType: 'image' | 'video',
  publicId: string
): Promise<{ secureUrl: string; publicId: string } | null> {
  const tried = new Set<string>();
  for (const url of urls) {
    const trimmed = (url || '').trim();
    if (!trimmed || tried.has(trimmed)) continue;
    tried.add(trimmed);
    const uploaded = await uploadRemoteMedia(trimmed, resourceType, publicId);
    if (uploaded) return uploaded;
  }
  return null;
}

export async function cacheSunoTrackMedia(input: CacheInput): Promise<CachedSunoMedia> {
  const sourceAudioUrl = (input.audioUrl || '').trim();
  const sourceStreamUrl = (input.streamUrl || '').trim();
  const sourceImageUrl = (input.imageUrl || '').trim();
  const baseId = `${publicIdPart(input.generationId)}_${publicIdPart(input.sunoId)}`;
  const refreshedAt = sourceAudioUrl || sourceStreamUrl || sourceImageUrl ? new Date().toISOString() : null;

  const existingAudioIsDurable = isUsableHttpMediaUrl(input.existingAudioUrl);
  const existingImageIsDurable = isUsableHttpMediaUrl(input.existingImageUrl);

  const cachedAudio = existingAudioIsDurable
    ? null
    : await uploadFirstRemoteMedia([sourceAudioUrl, sourceStreamUrl], 'video', `${baseId}_audio`);
  const cachedImage = existingImageIsDurable
    ? null
    : await uploadFirstRemoteMedia([sourceImageUrl], 'image', `${baseId}_cover`);

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
      cloudinary_audio_public_id: cachedAudio?.publicId || null,
      cloudinary_image_public_id: cachedImage?.publicId || null,
      media_cached_at: cachedAudio || cachedImage ? refreshedAt : null,
    },
  };
}
