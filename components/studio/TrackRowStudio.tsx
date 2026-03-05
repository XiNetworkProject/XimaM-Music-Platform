'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Music, Wand2, MoreHorizontal, Copy, RotateCcw, ChevronDown } from 'lucide-react';
import { SUNO_ICON_PILL, SUNO_BTN_BASE } from '@/components/ui/sunoClasses';

export interface LibraryTrackMinimal {
  id: string;
  title: string;
  durationSec: number;
  modelTag?: string;
  description?: string;
  coverUrl?: string;
  lyrics?: string;
  createdAt?: string;
}

function formatDuration(sec: number): string {
  if (!sec && sec !== 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface TrackRowStudioProps {
  track: LibraryTrackMinimal;
  isSelected: boolean;
  onToggleSelect: (id: string, options?: { multi?: boolean; range?: boolean }) => void;
  onPick: (track: LibraryTrackMinimal) => void;
  onPlay: (track: LibraryTrackMinimal) => void;
  onRemix: (track: LibraryTrackMinimal) => void;
  onReuseTrack?: (track: LibraryTrackMinimal) => void;
  onCopyLyrics?: (track: LibraryTrackMinimal) => void;
}

export function TrackRowStudio({
  track,
  isSelected,
  onToggleSelect,
  onPick,
  onPlay,
  onRemix,
  onReuseTrack,
  onCopyLyrics,
}: TrackRowStudioProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', close);
    };
  }, [menuOpen]);

  const title = track.title || 'Sans titre';
  const cover = track.coverUrl || '';
  const subtitle = (track.description || '').slice(0, 200);
  const hasMenu = onReuseTrack || onCopyLyrics;

  return (
    <div
      className={`group flex flex-nowrap items-stretch min-h-[80px] border-b border-border-primary/40 transition-colors ${
        menuOpen ? 'relative z-30 bg-white/[0.04]' : ''
      } hover:bg-white/[0.04] hover:shadow-[0_0_24px_-4px_rgba(139,92,246,0.15)]`}
      role="row"
      aria-label={title}
    >
      <div className="flex w-10 shrink-0 items-center justify-center py-3 pl-2" aria-hidden>
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border-primary bg-background-tertiary text-purple-500 focus:ring-purple-500/50"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(track.id, { multi: true });
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Sélectionner"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-nowrap items-stretch gap-3 pr-2 py-2">
        <div
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background-tertiary cursor-pointer flex items-center justify-center"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onPlay(track);
          }}
          onKeyDown={(e) => e.key === 'Enter' && onPlay(track)}
          aria-label={`Lire ${title}`}
        >
          {cover ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
                <Play className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              {track.durationSec > 0 && (
                <div className="absolute bottom-0 left-0 rounded-tr bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/90">
                  {formatDuration(track.durationSec)}
                </div>
              )}
            </>
          ) : (
            <Music className="w-6 h-6 text-foreground-tertiary" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              className="text-left text-sm font-semibold text-foreground-primary truncate max-w-full hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onPick(track);
              }}
            >
              {title}
            </button>
            <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-300">
              {track.modelTag ?? 'v5'}
            </span>
          </div>
          {subtitle && (
            <div className="truncate text-[11px] text-foreground-tertiary">{subtitle}</div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <button
              type="button"
              className={`${SUNO_ICON_PILL} p-1.5 rounded-full bg-foreground-primary text-background-primary hover:opacity-90`}
              onClick={(e) => {
                e.stopPropagation();
                onPlay(track);
              }}
              aria-label="Lire"
              title="Lire"
            >
              <Play className="w-4 h-4" fill="currentColor" />
            </button>
            <button
              type="button"
              className={`${SUNO_ICON_PILL} p-1.5 rounded-full bg-background-tertiary text-foreground-primary hover:bg-white/10`}
              onClick={(e) => {
                e.stopPropagation();
                onRemix(track);
              }}
              aria-label="Remix"
              title="Remix"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 pr-2">
        <button
          type="button"
          className={`${SUNO_BTN_BASE} hidden items-center gap-1 rounded-full px-3 py-2.5 text-xs text-foreground-primary bg-background-tertiary hover:bg-white/10 sm:flex group-hover:flex`}
          onClick={(e) => {
            e.stopPropagation();
            onRemix(track);
          }}
          aria-label="Remix / Modifier"
        >
          <span className="relative">Remix/Edit</span>
          <ChevronDown className="w-4 h-4 shrink-0" />
        </button>
        {hasMenu && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className={`${SUNO_ICON_PILL} p-2 rounded-full text-foreground-primary bg-background-tertiary hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity`}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 py-1 min-w-[200px] rounded-lg bg-[#0f0d14] border border-white/10 shadow-xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {onReuseTrack && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReuseTrack(track);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-foreground-primary hover:bg-white/10 flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    Réutiliser titre, style et paroles
                  </button>
                )}
                {onCopyLyrics && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyLyrics(track);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-foreground-primary hover:bg-white/10 flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    Copier les paroles
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
