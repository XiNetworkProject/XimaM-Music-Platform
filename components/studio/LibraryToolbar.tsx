'use client';

import { useRef, useEffect, useState } from 'react';
import { Search, RefreshCw, ChevronDown, X } from 'lucide-react';
import {
  SUNO_INPUT,
  SUNO_BTN_BASE,
  SUNO_PILL_SOLID,
} from '@/components/ui/sunoClasses';

export type LibraryFilterBy = 'all' | 'instrumental' | 'with-lyrics';
export type LibrarySortBy = 'newest' | 'oldest' | 'title';

export interface LibraryToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterBy: LibraryFilterBy;
  onFilterByChange: (value: LibraryFilterBy) => void;
  sortBy: LibrarySortBy;
  onSortByChange: (value: LibrarySortBy) => void;
  onRefresh: () => void;
  isRemixMode: boolean;
  onRemixModeToggle: () => void;
  remixSourceLabel: string | null;
  onClearRemixSource: () => void;
  hasRemixSource: boolean;
}

const SORT_LABELS: Record<LibrarySortBy, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  title: 'Title',
};

export function LibraryToolbar({
  searchQuery,
  onSearchChange,
  filterBy,
  onFilterByChange,
  sortBy,
  onSortByChange,
  onRefresh,
  isRemixMode,
  onRemixModeToggle,
  remixSourceLabel,
  onClearRemixSource,
  hasRemixSource,
}: LibraryToolbarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const close = (e: MouseEvent) => {
      if (sortRef.current?.contains(e.target as Node)) return;
      setSortOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', close);
    };
  }, [sortOpen]);

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-3 p-3 bg-background-primary/95 backdrop-blur border-b border-border-primary/60">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-full bg-background-tertiary border border-border-primary/60 max-w-xl">
          <Search className="w-4 h-4 text-foreground-tertiary shrink-0" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            aria-label="Rechercher dans la bibliothèque"
            className={`${SUNO_INPUT} flex-1 min-w-0 text-sm`}
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="p-1 rounded-full hover:bg-white/10 text-foreground-tertiary transition-colors"
              aria-label="Effacer la recherche"
              title="Effacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className={`${SUNO_PILL_SOLID} shrink-0`}
          title="Rafraîchir"
          aria-label="Rafraîchir la bibliothèque"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onFilterByChange('all')}
          className={`${SUNO_BTN_BASE} cursor-pointer rounded-full px-3 py-1.5 text-[11px] text-foreground-primary ${
            filterBy === 'all' ? 'bg-background-tertiary' : 'bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary'
          }`}
        >
          <span className="relative">Tout</span>
        </button>
        <button
          type="button"
          onClick={() => onFilterByChange('instrumental')}
          className={`${SUNO_BTN_BASE} cursor-pointer rounded-full px-3 py-1.5 text-[11px] text-foreground-primary ${
            filterBy === 'instrumental' ? 'bg-background-tertiary' : 'bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary'
          }`}
        >
          <span className="relative">Instrumental</span>
        </button>
        <button
          type="button"
          onClick={() => onFilterByChange('with-lyrics')}
          className={`${SUNO_BTN_BASE} cursor-pointer rounded-full px-3 py-1.5 text-[11px] text-foreground-primary ${
            filterBy === 'with-lyrics' ? 'bg-background-tertiary' : 'bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary'
          }`}
        >
          <span className="relative">Voix</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRemixModeToggle}
          className={`${SUNO_BTN_BASE} cursor-pointer rounded-full px-3 py-1.5 text-[11px] text-foreground-primary ${
            isRemixMode ? 'bg-background-tertiary' : 'bg-transparent before:border-border-primary enabled:hover:before:bg-overlay-on-primary'
          }`}
        >
          <span className="relative">Mode Remix</span>
        </button>
        <button
          type="button"
          onClick={onClearRemixSource}
          disabled={!hasRemixSource}
          className={`rounded-full px-3 py-1.5 text-[11px] border transition-colors ${
            hasRemixSource
              ? 'border-red-300/30 bg-red-500/10 text-red-200 hover:bg-red-500/20'
              : 'border-white/10 bg-white/[0.03] text-white/35 cursor-not-allowed'
          }`}
        >
          Retirer source remix
        </button>
        {remixSourceLabel && (
          <span className="text-[10px] text-cyan-200/90 truncate max-w-[260px]" title={remixSourceLabel}>
            Source: {remixSourceLabel}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-foreground-tertiary" />
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className={`${SUNO_PILL_SOLID} flex items-center gap-1.5 px-4 py-2 text-xs`}
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
            aria-label="Trier"
          >
            <span className="relative">{SORT_LABELS[sortBy]}</span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-44 bg-[#0a0812]/95 backdrop-blur border border-border-primary rounded-xl shadow-xl py-1 z-50"
              role="listbox"
            >
              {(['newest', 'oldest', 'title'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={sortBy === value}
                  onClick={() => {
                    onSortByChange(value);
                    setSortOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors text-sm text-foreground-primary"
                >
                  {SORT_LABELS[value]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
