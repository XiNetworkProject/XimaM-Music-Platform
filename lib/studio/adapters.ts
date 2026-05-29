import type { StudioTrack } from '@/lib/studio/types';
import type { AITrack } from '@/lib/aiGenerationService';
import { pickFirstPlayableHttpMediaUrl } from '@/lib/media-url-health';

function safeStr(v: any, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function safeOptStr(v: any): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function parseSourceLinks(value: any) {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function aiTrackToStudioTrack(ai: any, artistName: string): StudioTrack {
  const t = ai as AITrack & { generation?: any };
  const gen = (t as any).generation || null;
  const prompt = safeStr(t.prompt, safeStr(gen?.prompt, ''));
  const tags = Array.isArray((t as any).tags) ? ((t as any).tags as string[]) : [];
  const links: any = parseSourceLinks((t as any).source_links);
  const createdAt = safeStr(
    (t as any).media_fetched_at || links.provider_urls_refreshed_at || links.media_cached_at || t.created_at,
    safeStr(gen?.created_at, new Date().toISOString())
  );

  return {
    id: String(t.id),
    title: safeStr(t.title, 'Musique générée'),
    artistName: artistName || 'Artiste',
    createdAt,
    generationTaskId: safeOptStr(gen?.task_id),
    durationSec: typeof (t as any).duration === 'number' ? (t as any).duration : undefined,
    tags,
    prompt,
    lyrics: safeStr((t as any).lyrics, prompt || undefined),
    negativePrompt: undefined,
    model: safeStr((t as any).model_name, safeStr(gen?.model, 'V4_5')),
    audioUrl: pickFirstPlayableHttpMediaUrl([(t as any).audio_url, (t as any).stream_audio_url, links.provider_audio_url, links.provider_stream_audio_url], createdAt),
    coverUrl:
      pickFirstPlayableHttpMediaUrl([(t as any).image_url, links.provider_image_url], createdAt) ||
      '/brand/2026/synaura-symbol-2026-white.png',
    isFavorite: !!((t as any).is_liked ?? (t as any).is_favorite),
    isPublic: Boolean((t as any).is_public ?? gen?.is_public),
    status: 'ready',
    source: 'ai_track',
    raw: ai,
  };
}

