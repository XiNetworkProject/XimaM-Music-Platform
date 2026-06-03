'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Library, Loader2, Play, Search, User, X } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';

type SearchTrack = {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  audioUrl?: string | null;
  duration?: number;
  plays?: number;
  likes?: number;
};

type SearchPost = {
  id: string;
  content: string;
  author: string;
  avatar?: string | null;
};

type SearchArtist = {
  id: string;
  username: string;
  name: string;
  avatar?: string | null;
};

type SearchPlaylist = {
  id: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  trackCount?: number;
};

type SearchResults = {
  tracks: SearchTrack[];
  posts: SearchPost[];
  artists: SearchArtist[];
  playlists: SearchPlaylist[];
};

const emptyResults: SearchResults = { tracks: [], posts: [], artists: [], playlists: [] };

function safeString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeTrack(raw: any): SearchTrack | null {
  const id = safeString(raw?._id || raw?.id);
  const title = safeString(raw?.title);
  if (!id || !title) return null;

  return {
    id,
    title,
    artist: safeString(raw?.artist?.artistName || raw?.artist?.name || raw?.artist_name || raw?.artist, 'Artiste inconnu'),
    coverUrl: raw?.coverUrl || raw?.cover_url || null,
    audioUrl: raw?.audioUrl || raw?.audio_url || null,
    duration: Number(raw?.duration || 0),
    plays: Number(raw?.plays || 0),
    likes: Number(raw?.likes || 0),
  };
}

function normalizeArtist(raw: any): SearchArtist | null {
  const id = safeString(raw?._id || raw?.id);
  const username = safeString(raw?.username);
  const name = safeString(raw?.artistName || raw?.name || username, 'Créateur');
  if (!id || !username) return null;
  return { id, username, name, avatar: raw?.avatar || null };
}

function normalizePlaylist(raw: any): SearchPlaylist | null {
  const id = safeString(raw?._id || raw?.id);
  const title = safeString(raw?.title || raw?.name);
  if (!id || !title) return null;
  return {
    id,
    title,
    description: raw?.description || null,
    coverUrl: raw?.coverUrl || raw?.cover_url || null,
    trackCount: Number(raw?.trackCount || raw?.tracks_count || 0),
  };
}

function normalizePost(raw: any): SearchPost | null {
  const id = safeString(raw?._id || raw?.id);
  const content = safeString(raw?.content || raw?.text || raw?.excerpt, 'Post');
  const creator = raw?.creator || raw?.profiles || raw?.author || {};
  const author = safeString(creator?.name || creator?.username || raw?.authorName, 'Créateur');
  if (!id) return null;
  return { id, content, author, avatar: creator?.avatar || raw?.avatar || null };
}

function AvatarMark({ value, image }: { value: string; image?: string | null }) {
  if (image) {
    return <img src={image} alt="" className="h-10 w-10 rounded-full border border-black/[0.08] object-cover" />;
  }

  return (
    <div className="grid h-10 w-10 place-items-center rounded-full border border-black/[0.08] bg-black/[0.055] text-xs font-black uppercase text-black/50">
      {value.slice(0, 1) || '?'}
    </div>
  );
}

export default function SynauraUniversalSearch({
  compact = false,
  placeholder = 'Rechercher un son, un post, une playlist, un profil...',
}: {
  compact?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const { playTrack } = useAudioPlayer();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalResults = results.tracks.length + results.posts.length + results.artists.length + results.playlists.length;

  const clearSearch = useCallback(() => {
    abortRef.current?.abort();
    setQuery('');
    setResults(emptyResults);
    setOpen(false);
    setLoading(false);
  }, []);

  const runSearch = useCallback(async (value: string) => {
    const q = value.trim();
    if (q.length < 2) {
      abortRef.current?.abort();
      setResults(emptyResults);
      setOpen(false);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setOpen(true);

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(q)}&filter=all&limit=6`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      const json = await response.json().catch(() => null);
      setResults({
        tracks: (Array.isArray(json?.tracks) ? json.tracks : []).map(normalizeTrack).filter(Boolean) as SearchTrack[],
        posts: (Array.isArray(json?.posts) ? json.posts : []).map(normalizePost).filter(Boolean) as SearchPost[],
        artists: (Array.isArray(json?.artists) ? json.artists : []).map(normalizeArtist).filter(Boolean) as SearchArtist[],
        playlists: (Array.isArray(json?.playlists) ? json.playlists : []).map(normalizePlaylist).filter(Boolean) as SearchPlaylist[],
      });
    } catch (error: any) {
      if (error?.name !== 'AbortError') setResults(emptyResults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void runSearch(query), 240);
    return () => window.clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const goToSearchPage = () => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
  };

  return (
    <div ref={rootRef} className={`relative ${compact ? 'min-w-0 flex-1' : 'hidden max-w-2xl flex-1 lg:block'}`}>
      <div className="relative">
        <Search className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-black/35 ${compact ? 'left-2.5 h-3.5 w-3.5' : 'left-3 h-4 w-4 sm:left-4'}`} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim().length >= 2) setOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'Enter') {
              event.preventDefault();
              goToSearchPage();
            }
          }}
          placeholder={placeholder}
          className={compact
            ? 'h-8 w-full rounded-full border border-transparent bg-black/[0.055] pl-8 pr-9 text-[11px] font-semibold text-[#171313] outline-none placeholder:text-black/35 transition focus:border-black/[0.12] focus:bg-[#fffaf2]'
            : 'h-10 w-full rounded-full border border-transparent bg-black/[0.055] pl-9 pr-10 text-xs font-semibold text-[#171313] outline-none placeholder:text-black/35 transition focus:border-black/[0.12] focus:bg-[#fffaf2] sm:h-11 sm:pl-11 sm:text-sm'
          }
          aria-label="Recherche globale"
        />
        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/[0.06] text-black/42 transition hover:bg-black hover:text-white"
            aria-label="Effacer la recherche"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="fixed left-3 right-3 top-[5.2rem] z-[1000] max-h-[min(72vh,620px)] overflow-y-auto rounded-[1.35rem] border border-[#d8cbb8] bg-[#fff7ec] p-2 shadow-[0_28px_90px_rgba(30,25,20,0.28)] sm:left-1/2 sm:right-auto sm:w-[min(760px,calc(100vw-2rem))] sm:-translate-x-1/2 lg:absolute lg:left-0 lg:right-0 lg:top-[calc(100%+0.55rem)] lg:w-auto lg:translate-x-0">
          <div className="flex items-center justify-between rounded-[1rem] bg-[#efe4d4] px-3 py-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-black/48">
              {loading ? 'Recherche...' : totalResults ? `${totalResults} résultat(s)` : 'Recherche'}
            </p>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-black/35" /> : null}
          </div>

          {!loading && !totalResults ? (
            <div className="rounded-[1rem] bg-[#efe4d4] p-5 text-center">
              <Search className="mx-auto h-7 w-7 text-black/24" />
              <p className="mt-2 text-sm font-black text-black/58">Aucun résultat pour "{query}"</p>
            </div>
          ) : null}

          {results.tracks.length ? (
            <div className="mt-2 space-y-1">
              <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-black/42">Sons</p>
              {results.tracks.slice(0, 4).map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    if (track.audioUrl) {
                      void playTrack({
                        _id: track.id,
                        id: track.id,
                        title: track.title,
                        artist: track.artist,
                        audioUrl: track.audioUrl,
                        coverUrl: track.coverUrl || '/default-cover.svg',
                        duration: track.duration || 0,
                        likes: track.likes || 0,
                        plays: track.plays || 0,
                      } as any);
                    } else {
                      router.push(`/track/${encodeURIComponent(track.id)}`, { scroll: false });
                    }
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-[1rem] bg-[#fffaf2] p-2 text-left transition hover:bg-[#f2e7d7]"
                >
                  <img src={track.coverUrl || '/default-cover.svg'} alt="" className="h-11 w-11 rounded-[0.8rem] object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[#171313]">{track.title}</span>
                    <span className="block truncate text-xs font-semibold text-black/40">{track.artist}</span>
                  </span>
                  <Play className="h-4 w-4 text-black/42" />
                </button>
              ))}
            </div>
          ) : null}

          {results.posts.length ? (
            <div className="mt-2 space-y-1">
              <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-black/42">Posts</p>
              {results.posts.slice(0, 4).map((post) => (
                <Link key={post.id} href={`/posts/${encodeURIComponent(post.id)}`} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-[1rem] bg-[#fffaf2] p-2 transition hover:bg-[#f2e7d7]">
                  <AvatarMark value={post.author} image={post.avatar} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[#171313]">{post.author}</span>
                    <span className="line-clamp-2 text-xs font-semibold leading-5 text-black/46">{post.content}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {(results.artists.length || results.playlists.length) ? (
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {results.artists.slice(0, 3).map((artist) => (
                <Link key={artist.id} href={`/profile/${encodeURIComponent(artist.username)}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[1rem] bg-[#fffaf2] p-2 transition hover:bg-[#f2e7d7]">
                  <AvatarMark value={artist.name || artist.username} image={artist.avatar} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{artist.name}</span>
                    <span className="block truncate text-xs text-black/38">@{artist.username}</span>
                  </span>
                </Link>
              ))}
              {results.playlists.slice(0, 3).map((playlist) => (
                <Link key={playlist.id} href={`/playlists/${encodeURIComponent(playlist.id)}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[1rem] bg-[#fffaf2] p-2 transition hover:bg-[#f2e7d7]">
                  <div className="grid h-10 w-10 place-items-center rounded-[0.85rem] bg-black/[0.06]">
                    <Library className="h-4 w-4 text-black/42" />
                  </div>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{playlist.title}</span>
                    <span className="block truncate text-xs text-black/38">{playlist.trackCount || 0} sons</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={goToSearchPage}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[#171313] px-4 py-3 text-sm font-black text-white transition hover:scale-[1.01]"
          >
            <FileText className="h-4 w-4" />
            Voir tous les résultats
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
