'use client';

import Link from 'next/link';
import { Repeat2, Sparkles } from 'lucide-react';
import { isAiVariationAvailable } from '@/lib/remixPermissions';

type TrackLike = {
  _id?: string;
  id?: string;
  title?: string;
  audioUrl?: string;
  audio_url?: string;
  genre?: string[] | string;
  style?: string;
  isAI?: boolean;
  is_ai?: boolean;
  allowAiVariation?: boolean;
  allow_ai_variation?: boolean;
  canRemixAiVariation?: boolean;
  can_remix_ai_variation?: boolean;
  remixVisibility?: 'everyone' | 'followers' | 'disabled';
  remix_visibility?: 'everyone' | 'followers' | 'disabled';
};

type Props = {
  track: TrackLike | null | undefined;
  compact?: boolean;
  dark?: boolean;
  className?: string;
};

function trackId(track: TrackLike | null | undefined) {
  return String(track?._id || track?.id || '');
}

function styleHint(track: TrackLike | null | undefined) {
  if (!track) return '';
  if (typeof track.style === 'string' && track.style.trim()) return track.style.trim();
  if (Array.isArray(track.genre)) return track.genre.filter(Boolean).slice(0, 3).join(', ');
  if (typeof track.genre === 'string') return track.genre;
  return '';
}

export default function TrackCreateRemixActions({ track, compact, dark, className = '' }: Props) {
  const id = trackId(track);
  if (!id) return null;

  const source = encodeURIComponent(id);
  const style = encodeURIComponent(styleHint(track));
  const title = encodeURIComponent(String(track?.title || ''));
  const sourceTrackType = id.startsWith('ai-') ? 'ai_track' : 'track';
  const remixVisibility = track?.remixVisibility || track?.remix_visibility || 'disabled';
  const canRemix =
    typeof track?.canRemixAiVariation === 'boolean'
      ? track.canRemixAiVariation
      : typeof track?.can_remix_ai_variation === 'boolean'
        ? track.can_remix_ai_variation
        : isAiVariationAvailable({
            allowAiVariation: Boolean(track?.allowAiVariation ?? track?.allow_ai_variation),
            remixVisibility,
          });

  const base = dark
    ? 'border border-white/12 bg-white/8 text-white/74 hover:bg-white/14 hover:text-white'
    : 'border border-black/[0.08] bg-black/[0.045] text-[#171313]/68 hover:bg-[#171313] hover:text-white';
  const primary = dark
    ? 'bg-[#fffaf2] text-[#171313] hover:bg-white'
    : 'bg-[#171313] text-[#fffaf2] hover:opacity-90';
  const size = compact ? 'h-8 px-2.5 text-[10px]' : 'h-9 px-3 text-xs';
  const logAction = (eventType: 'create_style' | 'remix') => {
    fetch('/api/recommendations/impressions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: 'track', contentId: id, source: 'contextual-ai-action', eventType }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <Link
        href={`/ai-generator?mode=style&sourceTrack=${source}&title=${title}&style=${style}`}
        onClick={() => logAction('create_style')}
        className={`inline-flex items-center gap-1.5 rounded-full font-black transition ${size} ${primary}`}
      >
        <Sparkles className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {compact ? 'Créer' : 'Créer dans ce style'}
      </Link>
      {canRemix ? (
        <Link
          href={`/ai-generator?mode=remix&sourceTrackId=${source}&sourceTrackType=${sourceTrackType}&title=${title}&style=${style}`}
          onClick={() => logAction('remix')}
          className={`inline-flex items-center gap-1.5 rounded-full font-black transition ${size} ${base}`}
        >
          <Repeat2 className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          Remixer
        </Link>
      ) : null}
    </div>
  );
}
