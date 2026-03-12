'use client';

import { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { GENRE_CATEGORIES } from '@/lib/genres';

interface Props {
  selected: string[];
  onChange: (genres: string[]) => void;
  max?: number;
}

export default function GenrePicker({ selected, onChange, max = 5 }: Props) {
  const [search, setSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return GENRE_CATEGORIES;
    const q = search.toLowerCase();
    return GENRE_CATEGORIES.map((cat) => ({
      ...cat,
      genres: cat.genres.filter((g) => g.toLowerCase().includes(q)),
    })).filter((cat) => cat.genres.length > 0);
  }, [search]);

  const toggle = (genre: string) => {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre));
    } else if (selected.length < max) {
      onChange([...selected, genre]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggle(g)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-xs text-violet-300 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-300 transition"
            >
              {g}
              <X className="w-3 h-3" />
            </button>
          ))}
          <span className="text-[10px] text-white/30 self-center ml-1">{selected.length}/{max}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08]"
          placeholder="Rechercher un genre..."
        />
      </div>

      {/* Categories */}
      <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {filtered.map((cat) => {
          const isExpanded = expandedCat === cat.name || !!search.trim();
          const hasSelected = cat.genres.some((g) => selected.includes(g));
          return (
            <div key={cat.name}>
              <button
                type="button"
                onClick={() => setExpandedCat(isExpanded && !search.trim() ? null : cat.name)}
                className={[
                  'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition',
                  hasSelected ? 'text-white bg-white/[0.04]' : 'text-white/60 hover:bg-white/[0.03]',
                ].join(' ')}
              >
                <span className="text-base">{cat.emoji}</span>
                <span className="font-medium flex-1 text-left">{cat.name}</span>
                <span className="text-[10px] text-white/30">{cat.genres.length}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-white/30" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/30" />
                )}
              </button>
              {isExpanded && (
                <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
                  {cat.genres.map((g) => {
                    const isActive = selected.includes(g);
                    const disabled = !isActive && selected.length >= max;
                    return (
                      <button
                        key={g}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(g)}
                        className={[
                          'px-2.5 py-1 rounded-full text-xs transition-colors',
                          isActive
                            ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                            : disabled
                            ? 'bg-white/[0.02] border border-white/[0.05] text-white/20 cursor-not-allowed'
                            : 'bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/80',
                        ].join(' ')}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
