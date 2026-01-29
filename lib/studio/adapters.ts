import type { StudioTrack } from '@/lib/studio/types';
import type { AITrack } from '@/lib/aiGenerationService';

function safeStr(v: any, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function safeOptStr(v: any): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

export function aiTrackToStudioTrack(ai: any, artistName: string): StudioTrack {
  const t = ai as AITrack & { generation?: any };
  const gen = (t as any).generation || null;
  const prompt = safeStr(t.prompt, safeStr(gen?.prompt, ''));
  const tags = Array.isArray((t as any).tags) ? ((t as any).tags as string[]) : [];

  return {
    id: String(t.id),
    title: safeStr(t.title, 'Musique générée'),
    artistName: artistName || 'Artiste',
    createdAt: safeStr(t.created_at, safeStr(gen?.created_at, new Date().toISOString())),
    generationTaskId: safeOptStr(gen?.task_id),
    durationSec: typeof (t as any).duration === 'number' ? (t as any).duration : undefined,
    tags,
    prompt,
    lyrics: safeStr((t as any).lyrics, prompt || undefined),
    negativePrompt: undefined,
    model: safeStr((t as any).model_name, safeStr(gen?.model, 'V4_5')),
    audioUrl: safeStr((t as any).audio_url, safeStr((t as any).stream_audio_url, '')),
    coverUrl: safeStr((t as any).image_url, '/synaura_symbol.svg'),
    isFavorite: !!(t as any).is_favorite,
    status: 'ready',
    source: 'ai_track',
    raw: ai,
  };
}

