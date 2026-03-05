'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Play, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAudioPlayer } from '@/app/providers';
import Avatar from '@/components/Avatar';

interface Track {
  _id: string;
  title: string;
  artist: { _id: string; name: string; username: string; avatar?: string };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
}

interface Artist {
  _id: string;
  username: string;
  name: string;
  avatar?: string;
  followers: number;
}

interface Playlist {
  _id: string;
  name: string;
  coverUrl?: string;
  creator?: { username: string };
  tracks_count: number;
}

interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  playlists: Playlist[];
  total: number;
}

type FlatItem =
  | { kind: 'track'; id: string; track: Track }
  | { kind: 'artist'; id: string; artist: Artist }
  | { kind: 'playlist'; id: string; playlist: Playlist };

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function safeImg(url: string | undefined, fallback: string): string {
  if (!url || url === '' || url === 'null' || url === 'undefined') return fallback;
  return url;
}

export default function TopSearchBar() {
  const router = useRouter();
  const { playTrack } = useAudioPlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ tracks: [], artists: [], playlists: [], total: 0 });
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ tracks: [], artists: [], playlists: [], total: 0 });
      setShowResults(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const res = await fetch(`/api/search?query=${encodeURIComponent(q)}&filter=all&limit=10`, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) { setResults({ tracks: [], artists: [], playlists: [], total: 0 }); setError('Erreur de recherche'); return; }
      const data = await res.json().catch(() => ({}));
      setResults({
        tracks: Array.isArray(data.tracks) ? data.tracks : [],
        artists: Array.isArray(data.artists) ? data.artists : [],
        playlists: Array.isArray(data.playlists) ? data.playlists : [],
        total: data.totalResults || (data.tracks?.length || 0) + (data.artists?.length || 0) + (data.playlists?.length || 0),
      });
      setShowResults(true);
    } catch {
      if ((abortRef.current as any)?.signal?.aborted) return;
      setResults({ tracks: [], artists: [], playlists: [], total: 0 });
      setError('Erreur de recherche');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length >= 2) search(query.trim());
      else { abortRef.current?.abort(); setLoading(false); setError(null); setResults({ tracks: [], artists: [], playlists: [], total: 0 }); setShowResults(false); setActiveIdx(-1); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const flat: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    for (const t of results.tracks) items.push({ kind: 'track', id: t._id, track: t });
    for (const a of results.artists) items.push({ kind: 'artist', id: a._id, artist: a });
    for (const p of results.playlists) items.push({ kind: 'playlist', id: p._id, playlist: p });
    return items.slice(0, 15);
  }, [results]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as Element).closest('.search-root')) { setShowResults(false); setActiveIdx(-1); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const clear = () => { setQuery(''); setResults({ tracks: [], artists: [], playlists: [], total: 0 }); setShowResults(false); setActiveIdx(-1); setError(null); };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setShowResults(false); setActiveIdx(-1); return; }
    if (!showResults) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(flat.length - 1, i + 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(-1, i - 1)); return; }
    if (e.key === 'Enter') {
      const item = flat[activeIdx];
      if (!item) return;
      e.preventDefault();
      setShowResults(false); setActiveIdx(-1);
      if (item.kind === 'track') { playTrack(item.track as any); return; }
      if (item.kind === 'artist') { router.push(`/profile/${item.artist.username}`); return; }
      if (item.kind === 'playlist') router.push(`/playlists/${item.playlist._id}`);
    }
  };

  const isHighlighted = (kind: string, id: string) => activeIdx >= 0 && flat[activeIdx]?.kind === kind && flat[activeIdx]?.id === id;

  return (
    <div className="sticky top-0 z-40 bg-[#0a0a0e] border-b border-white/[0.06]">
      <div className="px-3 md:px-4 py-3">
        <div className="relative search-root">
          {/* Input */}
          <div className="relative h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center focus-within:border-neutral-600 transition-colors">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-neutral-500 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length >= 2) setShowResults(true); }}
              onFocus={() => { if (query.trim().length >= 2) setShowResults(true); }}
              onKeyDown={onKey}
              placeholder="Rechercher un titre, artiste, playlist..."
              className="w-full h-full pl-10 pr-10 bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none"
            />
            {query.trim().length > 0 && (
              <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors" aria-label="Effacer">
                <X className="h-3.5 w-3.5 text-neutral-400" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          <AnimatePresence>
            {showResults && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 bg-black/30 z-[60] md:hidden" onClick={() => setShowResults(false)} />

                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="fixed md:absolute top-16 md:top-full left-0 right-0 md:mt-2 bg-neutral-900 md:border border-neutral-800 md:rounded-xl shadow-2xl overflow-hidden z-[70] h-[calc(100vh-80px)] md:h-auto md:max-h-[520px]"
                >
                  {/* Mobile header */}
                  <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-3 flex items-center justify-between md:hidden z-10">
                    <span className="text-sm font-semibold text-white">{loading ? 'Recherche...' : `${results.total} résultat(s)`}</span>
                    <button onClick={() => setShowResults(false)} className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center" aria-label="Fermer">
                      <X className="w-4 h-4 text-neutral-400" />
                    </button>
                  </div>

                  <div className="overflow-y-auto h-[calc(100%-52px)] md:h-auto md:max-h-[520px] p-1.5">
                    {error && <div className="p-4 text-sm text-neutral-400">{error}</div>}

                    {loading && (
                      <div className="p-2 space-y-1.5">
                        {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-neutral-800/50 animate-pulse" />)}
                      </div>
                    )}

                    {/* Tracks */}
                    {results.tracks.length > 0 && (
                      <div>
                        <div className="px-2.5 py-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Titres</div>
                        {results.tracks.slice(0, 6).map((track) => (
                          <motion.div
                            key={track._id}
                            whileTap={{ scale: 0.98 }}
                            className={`group flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                              isHighlighted('track', track._id) ? 'bg-neutral-800' : 'hover:bg-neutral-800/60'
                            }`}
                            onClick={() => { playTrack(track as any); setShowResults(false); setActiveIdx(-1); }}
                          >
                            <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                              <img src={safeImg(track.coverUrl, '/default-cover.jpg')} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.jpg'; }} />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="w-4 h-4 text-white fill-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{track.title}</p>
                              <p className="text-[12px] text-neutral-500 truncate">{track.artist?.name || track.artist?.username}</p>
                            </div>
                            <span className="hidden md:inline text-[11px] text-neutral-600 tabular-nums">{formatDuration(track.duration)}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Artists */}
                    {results.artists.length > 0 && (
                      <div className="mt-1">
                        <div className="px-2.5 py-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Artistes</div>
                        {results.artists.slice(0, 6).map((artist) => (
                          <Link href={`/profile/${artist.username}`} key={artist._id} onClick={() => setShowResults(false)}>
                            <motion.div
                              whileTap={{ scale: 0.98 }}
                              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                                isHighlighted('artist', artist._id) ? 'bg-neutral-800' : 'hover:bg-neutral-800/60'
                              }`}
                            >
                              <Avatar src={safeImg(artist.avatar, '/default-avatar.png')} name={artist.name} username={artist.username} size="md" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{artist.name}</p>
                                <p className="text-[12px] text-neutral-500 truncate">Artiste</p>
                              </div>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Playlists */}
                    {results.playlists.length > 0 && (
                      <div className="mt-1">
                        <div className="px-2.5 py-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Playlists</div>
                        {results.playlists.slice(0, 6).map((pl) => (
                          <Link href={`/playlists/${pl._id}`} key={pl._id} onClick={() => setShowResults(false)}>
                            <motion.div
                              whileTap={{ scale: 0.98 }}
                              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                                isHighlighted('playlist', pl._id) ? 'bg-neutral-800' : 'hover:bg-neutral-800/60'
                              }`}
                            >
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                                <img src={safeImg(pl.coverUrl, '/default-cover.jpg')} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/default-cover.jpg'; }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{pl.name}</p>
                                <p className="text-[12px] text-neutral-500 truncate">Playlist · {pl.creator?.username || 'Utilisateur'}</p>
                              </div>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {!loading && results.total === 0 && query.trim() && (
                      <div className="text-center py-12">
                        <Search className="w-10 h-10 mx-auto mb-3 text-neutral-700" />
                        <p className="text-sm font-medium text-white">Aucun résultat pour &quot;{query}&quot;</p>
                        <p className="text-[12px] text-neutral-500 mt-1">Essayez d&apos;autres mots-clés</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
