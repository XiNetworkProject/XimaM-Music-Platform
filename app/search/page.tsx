'use client';

import { Suspense, useEffect, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowUpRight,
  Clock3,
  Disc3,
  Film,
  ListMusic,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Link from '@/components/navigation/HandoffLink';
import { SynauraAppShell } from '@/components/synaura/SynauraShell';
import { SynauraImage } from '@/components/ui/SynauraImage';
import TrackActionButton from '@/components/actions/TrackActionButton';
import { useProfilePeek } from '@/components/profile/useProfilePeek';
import { useAudioPlayer } from '@/app/providers';
import ExperienceMotionFrame from '@/components/ambient/ExperienceMotionFrame';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import SearchBox from '@/components/search/SearchBox';
import { useCatalogueSearch } from '@/components/search/useCatalogueSearch';
import {
  creatorName,
  resultHref,
  SEARCH_KINDS,
  SEARCH_LABELS,
  searchFilter,
  searchHref,
  type SearchKind,
  type SearchFilter,
} from '@/lib/search/model';
import '@/components/search/search-experience.css';

const icons = {
  tracks: Disc3,
  artists: Users,
  clips: Film,
  playlists: ListMusic,
  posts: MessageCircle,
};
const moods = [
  { label: 'Dans ma bulle', query: 'Ambient', color: '#789bef' },
  { label: 'De l’énergie', query: 'Electronic', color: '#b593fb' },
  { label: 'Tout en douceur', query: 'R&B', color: '#e6a4bb' },
  { label: 'Sans filtre', query: 'Rap', color: '#e6ad82' },
  { label: 'Un autre tempo', query: 'Jazz', color: '#8fd1c1' },
];
const RECENT = 'synaura.search.recent.v1';
const duration = (n: number) =>
  `${Math.floor((n || 0) / 60)}:${String(Math.floor((n || 0) % 60)).padStart(2, '0')}`;

function SearchContent() {
  const router = useRouter(),
    params = useSearchParams();
  const query = (params.get('q') || params.get('query') || '').trim().slice(0, 120),
    filter = searchFilter(params.get('filter'));
  const [input, setInput] = useState(query),
    [recent, setRecent] = useState<string[]>([]),
    [suggestions, setSuggestions] = useState<any[]>([]);
  const motion = useLivingMotion();
  const { results, pagination, loading, error, more, loadMore, retry } = useCatalogueSearch(
    input,
    filter,
    filter === 'all' ? 6 : 24,
  );
  const player = useAudioPlayer();
  const activeTrack = player.audioState.tracks[player.audioState.currentTrackIndex];
  const openProfilePeek = useProfilePeek('search');
  useEffect(() => {
    setInput(query);
  }, [query]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT) || '[]');
      setRecent(
        Array.isArray(stored)
          ? stored.filter((v) => typeof v === 'string' && v.length <= 120).slice(0, 6)
          : [],
      );
    } catch {}
  }, []);
  const remember = (value: string) => {
    if (value.trim().length < 2) return;
    setRecent((old) => {
      const next = [
        value.trim(),
        ...old.filter((v) => v.toLowerCase() !== value.trim().toLowerCase()),
      ].slice(0, 6);
      try {
        localStorage.setItem(RECENT, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const submit = (value = input, nextFilter: SearchFilter = filter) => {
    remember(value);
    setInput(value);
    router.replace(searchHref(value, nextFilter, params.toString()), { scroll: false });
  };
  useEffect(() => {
    if (query) return;
    const controller = new AbortController();
    fetch('/api/discover?sort=hidden&limit=6&profileLimit=4', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) setSuggestions(data?.tracks || []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [Boolean(query)]);
  const play = (track: any) => {
    remember(input);
    if (activeTrack?._id === track._id) {
      if (player.audioState.isPlaying) player.pause();
      else void player.play();
    } else void player.playTrack(track);
  };
  const count = SEARCH_KINDS.reduce((n, k) => n + results[k].length, 0);
  const hasQuery = input.trim().length >= 2;
  const chooseFilter = (kind: SearchFilter) => submit(input, kind);
  function trackRow(track: any, index: number) {
    const current = activeTrack?._id === track._id,
      playing = current && player.audioState.isPlaying;
    return (
      <article key={track._id} className="sx-track" data-playing={playing}>
        <span className="sx-track-number">{String(index + 1).padStart(2, '0')}</span>
        <button
          type="button"
          className="sx-track-play"
          aria-label={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title}`}
          onClick={() => play(track)}
        >
          <SynauraImage src={track.coverUrl || '/default-cover.svg'} alt="" />
          <span>
            {playing ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
          </span>
        </button>
        <Link
          className="sx-track-copy"
          href={resultHref('tracks', track)}
          onClick={() => remember(input)}
        >
          <strong>{track.title}</strong>
          <span>
            {creatorName(track)}
            {track.isAI ? ' · Création IA' : ''}
          </span>
        </Link>
        <span className="sx-track-duration">{duration(track.duration)}</span>
        <TrackActionButton track={track} origin="search" />
      </article>
    );
  }
  function section(kind: SearchKind) {
    const items = results[kind];
    if (!items.length) return null;
    const Icon = icons[kind];
    return (
      <section key={kind} className={`sx-section sx-section--${kind}`}>
        <header>
          <h2>
            <Icon size={19} />
            {SEARCH_LABELS[kind]}
          </h2>
          {filter === 'all' && (
            <button type="button" onClick={() => chooseFilter(kind)}>
              Tout voir <ArrowUpRight size={16} />
            </button>
          )}
        </header>
        {kind === 'tracks' ? (
          <div className="sx-tracks">{items.map(trackRow)}</div>
        ) : kind === 'artists' ? (
          <div className="sx-artists">
            {items.map((artist) => (
              <button
                key={artist._id}
                type="button"
                className="sx-artist"
                data-context-surface-trigger-key={`search-result-profile-${artist._id}`}
                onClick={(event) => {
                  remember(input);
                  openProfilePeek(artist.username, event.currentTarget);
                }}
                aria-label={`Aperçu du profil de ${artist.artistName || artist.name || artist.username}`}
              >
                <SynauraImage
                  src={artist.avatar || '/default-avatar.png'}
                  fallbackSrc="/default-avatar.png"
                  alt=""
                />
                <strong>{artist.artistName || artist.name || artist.username}</strong>
                <span>@{artist.username}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className={`sx-cards sx-cards--${kind}`}>
            {items.map((item) => (
              <Link
                key={item._id}
                className="sx-card"
                href={resultHref(kind, item)}
                onClick={() => remember(input)}
              >
                <div className="sx-card-art">
                  <SynauraImage
                    src={item.coverUrl || item.imageUrl || item.posterUrl || '/default-cover.svg'}
                    alt=""
                  />
                  <span>
                    <Icon size={18} />
                  </span>
                  {kind === 'clips' && <b>{duration(item.duration)}</b>}
                </div>
                <strong>{kind === 'posts' ? creatorName(item) : item.title || item.name}</strong>
                <p>
                  {kind === 'posts'
                    ? item.content
                    : kind === 'playlists'
                      ? `${item.trackCount || 0} sons · ${creatorName(item)}`
                      : creatorName(item)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }
  return (
    <SynauraAppShell contentClassName="max-w-[1400px]">
      <div
        className="sx-search"
        data-motion={motion.enabled}
        data-search-state={hasQuery ? 'results' : 'explore'}
      >
        <ExperienceMotionFrame className={`sx-hero ${hasQuery ? 'sx-hero--compact' : ''}`}>
          <div className="sx-hero-glow" aria-hidden="true" />
          <div className="sx-orbits" aria-hidden="true">
            <i />
            <i />
            <i />
            <span />
          </div>
          <div className="sx-hero-copy">
            <p className="sx-eyebrow">
              <span />À portée d’oreille
            </p>
            <h1>
              {hasQuery ? (
                'Trouve ce qui te fait vibrer.'
              ) : (
                <>
                  À la recherche
                  <br />
                  du <em>déclic.</em>
                </>
              )}
            </h1>
            {!hasQuery && (
              <p className="sx-hero-note">
                Un titre en tête. Un artiste à rencontrer.
                <br />
                Ou juste l’envie de te laisser surprendre.
              </p>
            )}
          </div>
          {!hasQuery && suggestions.length > 0 && (
            <div className="sx-cover-constellation" aria-hidden="true">
              {suggestions.slice(0, 3).map((track, i) => (
                <SynauraImage
                  key={track._id}
                  src={track.coverUrl || '/default-cover.svg'}
                  alt=""
                  style={{ '--index': i } as CSSProperties}
                />
              ))}
            </div>
          )}
        </ExperienceMotionFrame>
        <div className="sx-command">
          <SearchBox value={input} onChange={setInput} onSubmit={() => submit()} />
          <nav className="sx-filters" aria-label="Filtrer les résultats">
            {(['all', ...SEARCH_KINDS] as SearchFilter[]).map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={filter === kind}
                onClick={() => chooseFilter(kind)}
              >
                {SEARCH_LABELS[kind]}
                {hasQuery && !loading && results[kind as SearchKind]?.length > 0 && (
                  <span>
                    {results[kind as SearchKind].length}
                    {pagination[kind as SearchKind]?.hasMore ? '+' : ''}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        {!hasQuery ? (
          <div className="sx-explore">
            {input.trim().length === 1 && (
              <p role="status" className="sx-hint">
                Encore un caractère pour lancer la recherche.
              </p>
            )}
            {recent.length > 0 && (
              <section className="sx-recent">
                <header>
                  <h2>
                    <Clock3 size={16} />
                    Tes dernières pistes
                  </h2>
                  <button
                    onClick={() => {
                      setRecent([]);
                      try {
                        localStorage.removeItem(RECENT);
                      } catch {}
                    }}
                  >
                    Tout effacer
                  </button>
                </header>
                <div>
                  {recent.map((value) => (
                    <span key={value}>
                      <button onClick={() => submit(value)}>{value}</button>
                      <button
                        aria-label={`Retirer ${value}`}
                        onClick={() => {
                          const next = recent.filter((item) => item !== value);
                          setRecent(next);
                          try {
                            localStorage.setItem(RECENT, JSON.stringify(next));
                          } catch {}
                        }}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            )}
            <section className="sx-moods">
              <header>
                <h2>Plutôt quelle fréquence ?</h2>
                <span>À toi de choisir.</span>
              </header>
              <div>
                {moods.map((mood, i) => (
                  <button
                    key={mood.query}
                    style={{ '--mood-color': mood.color, '--index': i } as CSSProperties}
                    onClick={() => submit(mood.query, 'tracks')}
                  >
                    <span className="sx-mood-lines" aria-hidden="true">
                      {Array.from({ length: 9 }, (_, n) => (
                        <i key={n} style={{ '--bar': n } as CSSProperties} />
                      ))}
                    </span>
                    <strong>{mood.label}</strong>
                    <span>
                      {mood.query === 'Electronic' ? 'Électro' : mood.query}
                      <ArrowUpRight size={17} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
            {suggestions.length > 0 && (
              <section className="sx-section sx-suggestions">
                <header>
                  <h2>
                    <Sparkles size={19} />
                    D’autres horizons
                  </h2>
                  <Link href="/discover?tab=tracks&sort=hidden" prefetch={false}>
                    Explorer <ArrowUpRight size={16} />
                  </Link>
                </header>
                <div className="sx-tracks">{suggestions.map(trackRow)}</div>
              </section>
            )}
            <nav className="sx-other-paths" aria-label="Continuer l’exploration">
              <Link href="/discover" prefetch={false}>
                Toute la découverte <ArrowUpRight size={17} />
              </Link>
              <Link href="/radar" prefetch={false}>
                Le radar <ArrowUpRight size={17} />
              </Link>
              <Link href="/community" prefetch={false}>
                La communauté <ArrowUpRight size={17} />
              </Link>
            </nav>
          </div>
        ) : (
          <div className="sx-results" aria-busy={loading}>
            <div className="sx-result-status" role="status" aria-live="polite">
              {loading
                ? 'Recherche en cours…'
                : error && !count
                  ? 'Recherche indisponible'
                  : `${count} résultat${count > 1 ? 's' : ''} affiché${count > 1 ? 's' : ''}`}
              {!loading && count > 0 && (
                <span>
                  Classés par pertinence
                  {SEARCH_KINDS.some((k) => results[k].some((item) => item.approximateMatch))
                    ? ' · correspondances proches incluses'
                    : ''}
                </span>
              )}
            </div>
            {loading ? (
              <div className="sx-skeleton" aria-label="Chargement des résultats">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i}>
                    <i />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {error && (
                  <div className="sx-error" role="alert">
                    <p>{error}</p>
                    <button onClick={count ? () => void loadMore() : retry}>Réessayer</button>
                  </div>
                )}
                {!count && !error && (
                  <div className="sx-empty">
                    <Search size={36} />
                    <h2>Cette piste reste à trouver.</h2>
                    <p>
                      Aucune correspondance pour « {input} ».
                      <br />
                      Essaie un titre, un @pseudo ou un style.
                    </p>
                    <button onClick={() => submit('', 'all')}>
                      Explorer autre chose <ArrowUpRight size={17} />
                    </button>
                  </div>
                )}
                {SEARCH_KINDS.map(section)}
                {filter !== 'all' && pagination[filter]?.hasMore && (
                  <button className="sx-more" disabled={more} onClick={() => void loadMore()}>
                    {more ? <Loader2 className="sx-spin" size={18} /> : <ArrowDown size={18} />}
                    Afficher la suite
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </SynauraAppShell>
  );
}
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="sx-search sx-loading" role="status">
          Chargement de la recherche…
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
