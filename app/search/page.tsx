'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Library, Loader2, Music2, Search, User } from 'lucide-react';
import { SynauraAppShell, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

type ResultKind = 'all' | 'tracks' | 'posts' | 'artists' | 'playlists';

const FILTERS: Array<{ key: ResultKind; label: string }> = [
  { key: 'all', label: 'Tout' },
  { key: 'tracks', label: 'Sons' },
  { key: 'posts', label: 'Posts' },
  { key: 'artists', label: 'Profils' },
  { key: 'playlists', label: 'Playlists' },
];

function getCreatorName(item: any) {
  return item?.creator?.name || item?.artist?.name || item?.artist?.artistName || item?.artist || 'Créateur';
}

function EmptyState({ query }: { query: string }) {
  return (
    <SynauraPanel className="p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-[1.2rem] bg-black/[0.05] text-black/30">
        <Search className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-black tracking-[-0.04em] text-[#171313]">Aucun résultat</h2>
      <p className="mt-2 text-sm font-semibold text-black/48">
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

  const total = useMemo(() => (
    (results.tracks?.length || 0) +
    (results.posts?.length || 0) +
    (results.artists?.length || 0) +
    (results.playlists?.length || 0)
  ), [results]);

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
        <SynauraPanel className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Recherche</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[#171313] sm:text-5xl">
                {query ? `"${query}"` : 'Recherche globale'}
              </h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/52">
                Sons, posts, profils et playlists sont regroupés ici.
              </p>
            </div>
            <div className="rounded-full border border-black/[0.08] bg-black/[0.04] px-4 py-2 text-sm font-black text-black/54">
              {loading ? 'Recherche...' : `${total} résultat(s)`}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  filter === item.key
                    ? 'bg-[#171313] text-white'
                    : 'border border-black/[0.08] bg-black/[0.04] text-black/56 hover:bg-black/[0.08] hover:text-[#171313]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </SynauraPanel>

        {loading ? (
          <SynauraPanel className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-black/48">
            <Loader2 className="h-4 w-4 animate-spin" />
            Recherche en cours...
          </SynauraPanel>
        ) : query && !total ? (
          <EmptyState query={query} />
        ) : null}

        {!loading && total ? (
          <div className="grid gap-4">
            {(filter === 'all' || filter === 'tracks') && results.tracks?.length ? (
              <SynauraPanel className="p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-lg font-black tracking-[-0.04em] text-[#171313]"><Music2 className="h-5 w-5" /> Sons</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {results.tracks.map((track: any) => (
                    <Link key={track._id || track.id} href={`/track/${encodeURIComponent(track._id || track.id)}`} className="flex items-center gap-3 rounded-[1rem] border border-black/[0.08] bg-[#fff8ee] p-3 transition hover:bg-[#fff3e4]">
                      <img src={track.coverUrl || track.cover_url || '/default-cover.svg'} alt="" className="h-12 w-12 rounded-[0.85rem] object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[#171313]">{track.title}</span>
                        <span className="block truncate text-xs font-semibold text-black/42">{getCreatorName(track)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </SynauraPanel>
            ) : null}

            {(filter === 'all' || filter === 'posts') && results.posts?.length ? (
              <SynauraPanel className="p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-lg font-black tracking-[-0.04em] text-[#171313]"><FileText className="h-5 w-5" /> Posts</h2>
                <div className="mt-4 grid gap-2">
                  {results.posts.map((post: any) => (
                    <Link key={post._id || post.id} href={`/posts/${encodeURIComponent(post._id || post.id)}`} className="rounded-[1rem] border border-black/[0.08] bg-[#fff8ee] p-4 transition hover:bg-[#fff3e4]">
                      <div className="text-sm font-black text-[#171313]">{post.creator?.name || post.creator?.username || 'Créateur'}</div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-black/54">{post.content || post.excerpt || 'Post'}</div>
                    </Link>
                  ))}
                </div>
              </SynauraPanel>
            ) : null}

            {(filter === 'all' || filter === 'artists') && results.artists?.length ? (
              <SynauraPanel className="p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-lg font-black tracking-[-0.04em] text-[#171313]"><User className="h-5 w-5" /> Profils</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {results.artists.map((artist: any) => (
                    <Link key={artist._id || artist.id} href={`/profile/${encodeURIComponent(artist.username)}`} className="flex items-center gap-3 rounded-[1rem] border border-black/[0.08] bg-[#fff8ee] p-3 transition hover:bg-[#fff3e4]">
                      <img src={artist.avatar || '/default-avatar.png'} alt="" className="h-12 w-12 rounded-full object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[#171313]">{artist.artistName || artist.name || artist.username}</span>
                        <span className="block truncate text-xs font-semibold text-black/42">@{artist.username}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </SynauraPanel>
            ) : null}

            {(filter === 'all' || filter === 'playlists') && results.playlists?.length ? (
              <SynauraPanel className="p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-lg font-black tracking-[-0.04em] text-[#171313]"><Library className="h-5 w-5" /> Playlists</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {results.playlists.map((playlist: any) => (
                    <Link key={playlist._id || playlist.id} href={`/playlists/${encodeURIComponent(playlist._id || playlist.id)}`} className="flex items-center gap-3 rounded-[1rem] border border-black/[0.08] bg-[#fff8ee] p-3 transition hover:bg-[#fff3e4]">
                      <div className="grid h-12 w-12 place-items-center rounded-[0.85rem] bg-black/[0.06]">
                        <Library className="h-5 w-5 text-black/42" />
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[#171313]">{playlist.title || playlist.name}</span>
                        <span className="block truncate text-xs font-semibold text-black/42">{playlist.trackCount || playlist.tracks_count || 0} sons</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </SynauraPanel>
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
        <SynauraPanel className="flex items-center justify-center gap-2 p-8 text-sm font-semibold text-black/48">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </SynauraPanel>
      </SynauraAppShell>
    )}>
      <SearchPageContent />
    </Suspense>
  );
}
