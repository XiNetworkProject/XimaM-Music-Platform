'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, UserPlus, Plus } from 'lucide-react';

export interface FeaturingArtist {
  id: string;
  name: string;
  avatar?: string | null;
  isExternal?: boolean;
}

interface Props {
  artists: FeaturingArtist[];
  onChange: (artists: FeaturingArtist[]) => void;
}

export default function FeaturingSearch({ artists, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; username: string; name: string; avatar_url: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [externalName, setExternalName] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const searchUsers = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/emails?action=users&query=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.users || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchUsers]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const addSynaura = (user: typeof results[0]) => {
    if (artists.some((a) => a.id === user.id)) return;
    onChange([...artists, { id: user.id, name: user.name || user.username, avatar: user.avatar_url }]);
    setQuery('');
    setShowDropdown(false);
  };

  const addExternal = () => {
    const name = externalName.trim();
    if (!name) return;
    const id = `ext_${Date.now()}`;
    onChange([...artists, { id, name, isExternal: true }]);
    setExternalName('');
  };

  const remove = (id: string) => onChange(artists.filter((a) => a.id !== id));

  return (
    <div className="space-y-3">
      {/* Selected artists */}
      {artists.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {artists.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-white/70"
            >
              {a.avatar ? (
                <img src={a.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <UserPlus className="w-3.5 h-3.5 text-white/30" />
              )}
              {a.name}
              {a.isExternal && <span className="text-white/30">(ext.)</span>}
              <button type="button" onClick={() => remove(a.id)} className="hover:text-red-400 transition">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Synaura search */}
      <div ref={containerRef} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08]"
          placeholder="Rechercher un artiste Synaura..."
        />
        {showDropdown && (query.trim().length >= 2) && (
          <div className="absolute z-20 mt-1 w-full max-h-[200px] overflow-y-auto rounded-xl bg-[#1a1a2e] border border-white/[0.1] shadow-xl">
            {loading ? (
              <div className="px-3 py-2 text-xs text-white/40">Recherche...</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-xs text-white/40">Aucun resultat</div>
            ) : (
              results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => addSynaura(u)}
                  disabled={artists.some((a) => a.id === u.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[0.06] transition disabled:opacity-30"
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] text-violet-300">
                      {(u.name || u.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm">{u.name || u.username}</div>
                    {u.username && <div className="text-[10px] text-white/30">@{u.username}</div>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* External artist */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={externalName}
          onChange={(e) => setExternalName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExternal(); } }}
          className="flex-1 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08]"
          placeholder="Artiste externe (hors Synaura)"
        />
        <button
          type="button"
          onClick={addExternal}
          disabled={!externalName.trim()}
          className="h-9 px-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white/60 hover:bg-white/[0.1] transition disabled:opacity-30"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
