'use client';

import { useState } from 'react';
import { Music2 } from 'lucide-react';

const FALLBACK_GRADIENTS: [string, string][] = [
  ['#7c3aed', '#3b82f6'],
  ['#ec4899', '#8b5cf6'],
  ['#06b6d4', '#6366f1'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#06b6d4'],
  ['#8b5cf6', '#ec4899'],
];

function getGradient(seed?: string): [string, string] {
  if (!seed) return FALLBACK_GRADIENTS[0]!;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length]!;
}

interface TrackCoverProps {
  src?: string | null;
  alt?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
  rounded?: string;
  objectFit?: 'cover' | 'contain';
}

export default function TrackCover({
  src,
  alt,
  title,
  className = '',
  style,
  size,
  rounded = 'rounded-lg',
  objectFit = 'cover',
}: TrackCoverProps) {
  const [errored, setErrored] = useState(false);
  const [from, to] = getGradient(title);
  const showPlaceholder = !src || errored;
  const letter = (title || alt || '?')[0]?.toUpperCase() ?? '♪';

  if (showPlaceholder) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center ${rounded} ${className}`}
        style={{
          background: `linear-gradient(135deg, ${from}, ${to})`,
          width: size ? size : undefined,
          height: size ? size : undefined,
          ...style,
        }}
      >
        <Music2
          className="opacity-20 absolute"
          style={{ width: size ? size * 0.55 : 40, height: size ? size * 0.55 : 40 }}
        />
        <span
          className="relative z-10 font-black text-white/80 select-none"
          style={{ fontSize: size ? Math.max(size * 0.32, 12) : 20 }}
        >
          {letter}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={alt || title || ''}
      className={`${rounded} ${className}`}
      style={{
        objectFit,
        width: size ? size : undefined,
        height: size ? size : undefined,
        ...style,
      }}
      onError={() => setErrored(true)}
      loading="lazy"
      decoding="async"
    />
  );
}
