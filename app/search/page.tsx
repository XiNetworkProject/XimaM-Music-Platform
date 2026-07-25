'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Clock3, FileText, Library, Loader2, Music2, Search, TrendingUp, User, X } from 'lucide-react';
import { SynauraAppShell, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

type ResultKind = 'all' | 'tracks' | 'posts' | 'artists' | 'playlists';

const FILTERS: Array<{ key: ResultKind; label: string }> = [
  { key: 'all', label: 'Tout' },
  { key: 'tracks', label: 'Sons' },
  { key: 'posts', label: 'Posts' },
  { key: 'artists', label: 'Profils' },
  { key: 'playlists', label: 'Playlists' },
];
const RECENT_SEARCHES_KEY = 'synaura.search.recent.v1';

function getCreatorName(item: any) {
  return item?.creator?.name || item?.artist?.name || item?.artist?.artistName || item?.artist || 'Créateur';
}

function EmptyState({ query }: { query: string }) {
  return (
    <SynauraPanel className="p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-[12px] bg-[var(--syn-soft)] text-[var(--syn-text-secondary)]">
        <Search className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-black text-[var(--syn-text-primary)]">Aucun résultat</h2>
      <p className="mt-2 text-sm font-semibold text-[var(--syn-text-secondary)]">
        Aucun son, post, profil ou playlist trouvé pour "{query}".
      </p>
    </SynauraPanel>
  );
}

function SearchPageContent() {
  const params = useSearchParams();
  const query = (params.get('q') || params.get('query') || '').trim();
  const [filter, setFilter] = useState<ResultKind>('all');
  const [results, setResults] = useState<any>({ tracks: [], posts: [], artists: [], playlists: [] });
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any>({ tracks: [], artists: [] });
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const total = useMemo(() => (
    (results.tracks?.length || 0) +
    (results.posts?.length || 0) +
    (results.artists?.length || 0) +
    (results.playlists?.length || 0)
  ), [results]);

  useEffect(() => {
    try {
      const value = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      setRecent(Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, 6) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (query.length < 2) return;
    setRecent((current) => {
      const next = [query, ...current.filter((item) => item.toLocaleLowerCase('fr-FR') !== query.toLocaleLowerCase('fr-FR'))].slice(0, 6);
      try {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [query]);

  useEffect(() => {
    if (query) return;
    let active = true;
    setSuggestionsLoading(true);
    Promise.all([
      fetch('/api/tracks/trending?limit=8', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
      fetch('/api/users/popular?limit=6', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null),
    ])
      .then(([trackPayload, artistPayload]) => {
        if (!active) return;
        setSuggestions({
          tracks: Array.isArray(trackPayload?.tracks) ? trackPayload.tracks.slice(0, 8) : [],
          artists: Array.isArray(artistPayload?.users) ? artistPayload.users.slice(0, 6) : [],
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setSuggestionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    if (!query) {
      setResults({ tracks: [], posts: [], artists: [], playlists: [] });
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/search?query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}&limit=30`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((json) => setResults({
        tracks: Array.isArray(json?.tracks) ? json.tracks : [],
        posts: Array.isArray(json?.posts) ? json.posts : [],
        artists: Array.isArray(json?.artists) ? json.artists : [],
        playlists: Array.isArray(json?.playlists) ? json.playlists : [],
      }))
      .catch((error) => {
        if (error?.name !== 'AbortError') setResults({ tracks: [], posts: [], artists: [], playlists: [] });
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query, filter]);

  return (
    <SynauraAppShell contentClassName="max-w-[1180px]">
      <SynauraTopBar searchLabel="Rechercher un son, un post, un profil..." />

      <div className="space-y-4 pb-28">
        <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase text-[var(--syn-accent-blue)]">Recherche</p>
            <h1 className="mt-1 text-3xl font-black text-[var(--syn-text-primary)] sm:text-4xl">
              {query ? `"${query}"` : 'Recherche'}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--syn-text-secondary)]">
              Sons, artistes, playlists et communauté.
            </p>
          </div>
          {query ? (
            <div className="rounded-[10px] border border-[var(--syn-border)] bg-[var(--syn-soft)] px-4 py-2 text-sm font-black text-[var(--syn-text-secondary)]">
              {loading ? 'Recherche...' : `${total} résultat(s)`}
            </div>
          ) : null}
        </div>

        {query ? (
          <nav className="synaura-no-scrollbar flex gap-1 overflow-x-auto rounded-[12px] border border-[var(--syn-border)] bg-[var(--syn-surface-muted)] p-1" aria-label="Filtrer les résultats">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`h-10 shrink-0 rounded-[9px] px-4 text-sm font-black transition ${
                  filter === item.key
                    ? 'bg-[var(--syn-surface)] text-[var(--syn-text-primary)] shadow-sm'
                    : 'text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}

        {!query ? (
          <div className="grid gap-4">
            {suggestionsLoading ? (
              <div className="border-t border-[var(--syn-border)] px-1 pt-4">
                <div className="h-5 w-28 animate-pulse rounded-[6px] bg-[var(--syn-soft)]" />
                <div className="mt-3 divide-y divide-[var(--syn-border)]">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex min-h-[66px] items-center gap-3 py-2.5">
                      <div className="h-12 w-12 animate-pulse rounded-[8px] bg-[var(--syn-soft)]" />
                      <div className="flex-1">
                        <div className="h-4 w-2/3 animate-pulse rounded-[5px] bg-[var(--syn-soft)]" />
                        <div className="mt-2 h-3 w-1/3 animate-pulse rounded-[5px] bg-[var(--syn-soft)]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {recent.length ? (
              <section className="border-t border-[var(--syn-border)] px-1 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-black text-[var(--syn-text-primary)]">
                    <Clock3 className="h-4 w-4 text-[var(--syn-accent-blue)]" />
                    Recherches récentes
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setRecent([]);
                      try {
                        window.localStorage.removeItem(RECENT_SEARCHES_KEY);
                      } catch {}
                    }}
                    className="text-xs font-black text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]"
                  >
                    Effacer
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recent.map((item) => (
                    <span key={item} className="inline-flex h-9 items-center rounded-[9px] border border-[var(--syn-border)] bg-[var(--syn-soft)]">
                      <Link href={`/search?q=${encodeURIComponent(item)}`} className="px-3 text-xs font-black text-[var(--syn-text-primary)]">
                        {item}
                      </Link>
                      <button
                        type="button"
                        aria-label={`Retirer ${item}`}
                        onClick={() => {
                          setRecent((current) => {
                            const next = current.filter((value) => value !== item);
                            try {
                              window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
                            } catch {}
                            return next;
                          });
                        }}
                        className="grid h-9 w-8 place-items-center text-[var(--syn-text-secondary)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {suggestions.tracks.length ? (
              <section className="border-t border-[var(--syn-border)] px-1 pt-4">
                <h2 className="flex items-center gap-2 text-base font-black text-[var(--syn-text-primary)]">
                  <TrendingUp className="h-4 w-4 text-[var(--syn-accent-coral)]" />
                  Tendances
                </h2>
                <div className="mt-3 divide-y divide-[var(--syn-border)] sm:grid sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0">
                  {suggestions.tracks.map((track: any) => (
                    <Link
                      key={track._id || track.id}
                      href={`/track/${encodeURIComponent(track._id || track.id)}`}
                      className="flex min-h-[66px] items-center gap-3 px-1 py-2.5 transition hover:bg-[var(--syn-soft)]"
                    >
                      <img src={track.coverUrl || track.cover_url || '/default-cover.svg'} alt="" className="h-12 w-12 rounded-[8px] object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[var(--syn-text-primary)]">{track.title}</span>
                        <span className="block truncate text-xs font-semibold text-[var(--syn-text-secondary)]">{getCreatorName(track)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {suggestions.artists.length ? (
              <section className="border-t border-[var(--syn-border)] px-1 pt-4">
                <h2 className="flex items-center gap-2 text-base font-black text-[var(--syn-text-primary)]">
                  <User className="h-4 w-4 text-[var(--syn-accent)]" />
                  Artistes à découvrir
                </h2>
                <div className="synaura-no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                  {suggestions.artists.map((artist: any) => (
                    <Link
                      key={artist._id || artist.id}
                      href={`/profile/${encodeURIComponent(artist.username)}`}
                      className="flex w-[190px] shrink-0 items-center gap-3 rounded-[12px] border border-[var(--syn-border)] bg-[var(--syn-surface)] p-2.5 transition hover:bg-[var(--syn-soft)]"
                    >
                      <img src={artist.avatar || '/default-avatar.png'} alt="" className="h-11 w-11 rounded-full object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[var(--syn-text-primary)]">{artist.artistName || artist.name || artist.username}</span>
                        <span className="block truncate text-xs text-[var(--syn-text-secondary)]">@{artist.username}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <SynauraPanel className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-[var(--syn-text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Recherche en cours...
          </SynauraPanel>
        ) : query && !total ? (
          <EmptyState query={query} />
        ) : null}

        {!loading && total ? (
          <div className="grid gap-4">
            {(filter === 'all' || filter === 'tracks') && results.tracks?.length ? (
              <section className="border-t border-[var(--syn-border)] px-1 pt-4">
                <h2 className="flex items-center gap-2 text-lg font-black text-[var(--syn-text-primary)]"><Music2 className="h-5 w-5" /> Sons</h2>
                <div className="mt-3 divide-y divide-[var(--syn-border)] sm:grid sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0">
                  {results.tracks.map((track: any) => (
                    <Link key={track._id || track.id} href={`/track/${encodeURIComponent(track._id || track.id)}`} className="flex min-h-[66px] items-center gap-3 px-1 py-2.5 transition hover:bg-[var(--syn-soft)]">
                      <img src={track.coverUrl || track.cover_url || '/default-cover.svg'} alt="" className="h-12 w-12 rounded-[8px] object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[var(--syn-text-primary)]">{track.title}</span>
                        <span className="block truncate text-xs font-semibold text-[var(--syn-text-secondary)]">{getCreatorName(track)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {(filter === 'all' || filter === 'posts') && results.posts?.length ? (
              <section className="border-t border-[var(--syn-border)] px-1 pt-4">
                <h2 className="flex items-center gap-2 text-lg font-black text-[var(--syn-text-primary)]"><FileText className="h-5 w-5" /> Posts</h2>
                <div className="mt-3 divide-y divide-[var(--syn-border)]">
                  {results.posts.map((post: any) => (
                    <Link key={post._id || post.id} href={`/posts/${encodeURIComponent(post._id || post.id)}`} className="block px-1 py-3 transition hover:bg-[var(--syn-soft)]">
                      <div className="text-sm font-black text-[var(--syn-text-primary)]">{post.creator?.name || post.creator?.username || 'Créateur'}</div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-[var(--syn-text-secondary)]">{post.content || post.excerpt || 'Post'}</div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {(filter === 'all' || filter === 'artists') && results.artists?.length ? (
              <section className="border-t border-[var(--syn-border)] px-1 pt-4">
                <h2 className="flex items-center gap-2 text-lg font-black text-[var(--syn-text-primary)]"><User className="h-5 w-5" /> Profils</h2>
                <div className="mt-3 divide-y divide-[var(--syn-border)] sm:grid sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0">
                  {results.artists.map((artist: any) => (
                    <Link key={artist._id || artist.id} href={`/profile/${encodeURIComponent(artist.username)}`} className="flex min-h-[66px] items-center gap-3 px-1 py-2.5 transition hover:bg-[var(--syn-soft)]">
                      <img src={artist.avatar || '/default-avatar.png'} alt="" className="h-12 w-12 rounded-full object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[var(--syn-text-primary)]">{artist.artistName || artist.name || artist.username}</span>
                        <span className="block truncate text-xs font-semibold text-[var(--syn-text-secondary)]">@{artist.username}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {(filter === 'all' || filter === 'playlists') && results.playlists?.length ? (
              <section className="border-t border-[var(--syn-border)] px-1 pt-4">
                <h2 className="flex items-center gap-2 text-lg font-black text-[var(--syn-text-primary)]"><Library className="h-5 w-5" /> Playlists</h2>
                <div className="mt-3 divide-y divide-[var(--syn-border)] sm:grid sm:grid-cols-2 sm:gap-x-4 sm:divide-y-0">
                  {results.playlists.map((playlist: any) => (
                    <Link key={playlist._id || playlist.id} href={`/playlists/${encodeURIComponent(playlist._id || playlist.id)}`} className="flex min-h-[66px] items-center gap-3 px-1 py-2.5 transition hover:bg-[var(--syn-soft)]">
                      <div className="grid h-12 w-12 place-items-center rounded-[8px] bg-[var(--syn-soft)]">
                        <Library className="h-5 w-5 text-[var(--syn-text-secondary)]" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[var(--syn-text-primary)]">{playlist.title || playlist.name}</span>
                        <span className="block truncate text-xs font-semibold text-[var(--syn-text-secondary)]">{playlist.trackCount || playlist.tracks_count || 0} sons</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </SynauraAppShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={(
      <SynauraAppShell contentClassName="max-w-[1180px]">
        <SynauraTopBar searchLabel="Rechercher un son, un post, un profil..." />
        <SynauraPanel className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-[var(--syn-text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </SynauraPanel>
      </SynauraAppShell>
    )}>
      <SearchPageContent />
    </Suspense>
  );
}
