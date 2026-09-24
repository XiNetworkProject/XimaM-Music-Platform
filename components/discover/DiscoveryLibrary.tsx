'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUpRight, Music2, Compass, Disc3, Grid2X2, LayoutList, ListMusic, Loader2, MessageCircle, Moon, Pause, Play, Radio, Search, Sparkles, Users, X, Zap } from 'lucide-react';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import ExperienceMotionFrame from '@/components/ambient/ExperienceMotionFrame';
import PilotImage from '@/components/pilot/PilotImage';
import PilotLink from '@/components/pilot/PilotLink';
import { DISCOVER_MOODS, type MoodId } from '@/lib/discoverMoods';
import { discoveryView, searchFilter, uniqueItems, type DiscoveryPage, type DiscoveryTab, type LibraryPlaylist, type LibraryTrack, type SearchResults } from '@/lib/discoverLibrary';
import { DiscoveryArtistCard, DiscoveryPlaylistCard, DiscoveryPostCard, DiscoveryTrackCard, artistName, compactNumber, useDiscoveryPlayback } from './DiscoveryCards';
import { useDiscoveryCatalogue, useDiscoveryPosts, useDiscoveryQuery } from './useDiscoveryData';
import './discovery-library.css';

const tabs = [
  { id: 'explore', label: 'Pour explorer', Icon: Compass }, { id: 'tracks', label: 'Sons', Icon: Disc3 },
  { id: 'newest', label: 'Nouveautés', Icon: Sparkles }, { id: 'artists', label: 'Artistes', Icon: Users },
  { id: 'posts', label: 'Posts', Icon: MessageCircle }, { id: 'playlists', label: 'Playlists', Icon: ListMusic },
] as const;
const genres = ['Pop', 'Rap', 'Electronic', 'Rock', 'R&B', 'Jazz', 'Ambient', 'Classical'];
const genreLabel: Record<string, string> = { Electronic: 'Électro', Classical: 'Classique' };

function useApproach(once = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting && once) observer.disconnect();
    }, { rootMargin: once ? '400px' : '0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [once]);
  return { ref, visible };
}
function Deferred({ children }: { children: ReactNode }) {
  const { ref, visible } = useApproach();
  return <div ref={ref} className="dl-deferred" data-ready={visible}>{visible ? children : <div className="dl-section-placeholder" aria-hidden="true" />}</div>;
}
function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  return <header className="dl-section-heading"><div>{eyebrow && <p className="dl-eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{onAction && <button type="button" className="dl-text-action" onClick={onAction}>{action || 'Tout voir'}<ArrowUpRight size={17} /></button>}</header>;
}
function Skeleton({ count = 6 }: { count?: number }) {
  return <div className="dl-track-grid" role="status" aria-label="Chargement de la sélection">{Array.from({ length: count }, (_, i) => <div className="dl-skeleton" key={i} aria-hidden="true"><div /><span /><span /></div>)}</div>;
}
function Empty({ title = 'Rien ici, pour le moment.', children }: { title?: string; children?: ReactNode }) {
  return <div className="dl-empty"><Compass size={32} /><h3>{title}</h3>{children || <p>Changez d’ambiance ou explorez une autre sélection.</p>}</div>;
}
function Failure({ retry }: { retry: () => unknown }) {
  return <div className="dl-failure" role="alert"><p>Cette sélection n’a pas pu être chargée.</p><button type="button" onClick={() => void retry()}>Réessayer <ArrowRight size={16} /></button></div>;
}

/** Auto-load a few pages, then require a gesture. The footer always stays reachable. */
function More({ hasMore, busy, error, load, count }: { hasMore: boolean; busy: boolean; error: boolean; load: () => unknown; count: number }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [automatic, setAutomatic] = useState(false);
  const [budget, setBudget] = useState(3);
  useEffect(() => {
    if (!automatic || budget <= 0 || busy || error || !hasMore || !sentinel.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect(); setBudget(value => value - 1); void load();
    }, { rootMargin: '240px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [automatic, budget, busy, count, error, hasMore, load]);
  return <div className="dl-more" ref={sentinel}>
    {error && <p role="alert">La suite n’a pas pu être chargée. Votre sélection reste disponible.</p>}
    {hasMore || error ? <><button type="button" className="dl-load-more" disabled={busy} onClick={() => { setAutomatic(true); setBudget(3); void load(); }}>{busy ? <Loader2 className="dl-spin" size={18} /> : <ArrowDown size={18} />}{busy ? 'La suite arrive…' : error ? 'Réessayer' : 'Continuer l’exploration'}</button><span>{count} éléments explorés{automatic && budget > 0 ? ' · chargement progressif activé' : ''}</span></> : <p>Vous avez fait le tour de cette sélection.<br /><span>Une autre ambiance, une autre rencontre.</span></p>}
  </div>;
}

function Hero({ tracks, total, onBrowse }: { tracks: LibraryTrack[]; total: number; onBrowse: () => void }) {
  const [chosen, setChosen] = useState('');
  const lead = tracks.find(track => track._id === chosen) || tracks[0];
  const { playing, toggle } = useDiscoveryPlayback(lead, tracks);
  const { ref, visible } = useApproach(false);
  return <div ref={ref} data-visible={visible} className="dl-hero-wrap"><ExperienceMotionFrame className="dl-hero">
    <div className="dl-hero-light" aria-hidden="true" /><div className="dl-hero-orbit" aria-hidden="true" /><div className="dl-hero-dust" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}</div>
    <div className="dl-hero-copy"><p className="dl-eyebrow"><span className="dl-status-dot" />Laissez-vous surprendre</p><h2>Votre prochaine<br /><em>obsession.</em></h2><p>Un son. Une rencontre.<br />Et tout ce qui vient après.</p><button className="dl-primary" type="button" onClick={onBrowse}>Explorer les sons <ArrowRight size={18} /></button><span className="dl-hero-foot">{total ? `${compactNumber(total)} sons à explorer` : 'Le son nous rapproche'}<i />À votre rythme.</span></div>
    <div className="dl-hero-stage">
      <div className="dl-record-halo" aria-hidden="true" />
      {lead ? <><div className="dl-hero-stack" aria-hidden="true">{tracks.slice(1, 3).map((track, i) => <PilotImage className={`dl-hero-echo dl-hero-echo--${i}`} key={track._id} src={track.coverUrl || '/default-cover.svg'} alt="" />)}</div>
        <button type="button" className="dl-hero-record" aria-label={`${playing ? 'Mettre en pause' : 'Écouter'} ${lead.title}`} disabled={!lead.audioUrl} onClick={toggle}><PilotImage src={lead.coverUrl || '/default-cover.svg'} alt={`Pochette de ${lead.title}`} loading="eager" /><span className="dl-hero-record-shine" /><span className="dl-hero-record-play">{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</span></button>
        <div className="dl-hero-caption"><span className="dl-eyebrow">{playing ? 'En lecture' : 'Un premier son'}</span><PilotLink href={`/track/${encodeURIComponent(lead._id)}`}>{lead.title}<ArrowUpRight size={18} /></PilotLink><p>{artistName(lead)}</p></div>
        <div className="dl-hero-choices" aria-label="Choisir le morceau à la une">{tracks.slice(0, 4).map(track => <button key={track._id} type="button" aria-label={`Mettre à la une ${track.title}`} aria-pressed={lead._id === track._id} onClick={() => setChosen(track._id)}><PilotImage src={track.coverUrl || '/default-cover.svg'} alt="" /></button>)}</div>
      </> : <div className="dl-hero-empty" aria-hidden="true"><Disc3 size={100} /></div>}
    </div>
  </ExperienceMotionFrame></div>;
}

function FreshSection({ onAll }: { onAll: () => void }) {
  const query = useDiscoveryQuery<DiscoveryPage>('/api/discover?sort=newest&limit=6');
  return <section className="dl-section"><SectionHeading eyebrow="Le catalogue ne dort jamais" title="Tout juste sortis." onAction={onAll} />{query.isPending ? <Skeleton /> : query.isError ? <Failure retry={query.refetch} /> : query.data?.tracks.length ? <div className="dl-track-grid">{query.data.tracks.map((track, index) => <DiscoveryTrackCard key={track._id} track={track} queue={query.data.tracks} index={index} />)}</div> : <Empty title="Les prochaines sorties arrivent." />}</section>;
}
function PostsSection({ preview = false, onAll }: { preview?: boolean; onAll?: () => void }) {
  const query = useDiscoveryPosts(true);
  const posts = uniqueItems(query.data?.pages.flatMap(page => page.posts) || [], post => post.id);
  return <section className="dl-section"><SectionHeading eyebrow="De l’autre côté du son" title="Ça se passe ici." onAction={onAll} action="Tous les posts" />{query.isPending ? <Skeleton count={3} /> : query.isError && !posts.length ? <Failure retry={query.refetch} /> : posts.length ? <><div className="dl-post-grid">{(preview ? posts.slice(0, 3) : posts).map(post => <DiscoveryPostCard key={post.id} post={post} />)}</div>{!preview && <More hasMore={Boolean(query.hasNextPage)} busy={query.isFetching} error={query.isFetchNextPageError} load={query.fetchNextPage} count={posts.length} />}</> : <Empty title="Les conversations commencent avec vous."><p>Les publications publiques des créateurs apparaîtront ici.</p><PilotLink href="/create">Créer une publication <ArrowUpRight size={16} /></PilotLink></Empty>}</section>;
}
function PlaylistSection({ preview = false, onAll }: { preview?: boolean; onAll?: () => void }) {
  const query = useDiscoveryQuery<{ playlists: LibraryPlaylist[] }>('/api/playlists/popular?limit=50');
  const playlists = uniqueItems(query.data?.playlists || [], item => item._id);
  return <section className="dl-section"><SectionHeading eyebrow="Une sélection. Tout un monde." title="À écouter longtemps." onAction={onAll} action="Toutes les playlists" />{query.isPending ? <Skeleton count={4} /> : query.isError ? <Failure retry={query.refetch} /> : playlists.length ? <div className="dl-playlist-grid">{(preview ? playlists.slice(0, 4) : playlists).map(playlist => <DiscoveryPlaylistCard key={playlist._id} playlist={playlist} />)}</div> : <Empty title="Les sélections prennent forme."><p>Les playlists publiques seront réunies ici.</p><PilotLink href="/library">Ouvrir ma bibliothèque <ArrowUpRight size={16} /></PilotLink></Empty>}</section>;
}

export default function DiscoveryLibrary() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { tab, sort, query: search, genre } = discoveryView(params);
  const [draft, setDraft] = useState(search);
  const [mood, setMood] = useState<MoodId | null>(null);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const motion = useLivingMotion();
  const pendingParams = useRef<string | null>(null);
  useEffect(() => { if (pendingParams.current === params.toString()) pendingParams.current = null; }, [params]);
  const update = useCallback((values: Record<string, string | null>) => {
    // Compose rapid tab/search gestures even while the previous URL is in flight.
    const next = new URLSearchParams(pendingParams.current ?? params.toString());
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    pendingParams.current = next.toString();
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  }, [params, pathname, router]);
  useEffect(() => setDraft(search), [search]);
  useEffect(() => {
    if (draft.trim() === search) return;
    const timer = setTimeout(() => update({ q: draft.trim().slice(0, 120) || null }), 350);
    return () => clearTimeout(timer);
  }, [draft, search, update]);
  const pageTop = useRef<HTMLDivElement>(null);
  const returnToTop = () => pageTop.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  const chooseTab = (next: DiscoveryTab) => { setMood(null); update({ tab: next === 'explore' ? null : next, genre: null }); returnToTop(); };
  const isSearch = Boolean(search);
  const isCatalogue = !isSearch && !mood && ['explore', 'tracks', 'newest', 'artists'].includes(tab);
  const catalogue = useDiscoveryCatalogue(tab === 'newest' ? 'newest' : sort, genre, tab === 'artists', isCatalogue);
  const tracks = useMemo(() => uniqueItems(catalogue.data?.pages.flatMap(page => page.tracks) || [], track => track._id), [catalogue.data]);
  const artists = useMemo(() => uniqueItems(catalogue.data?.pages.flatMap(page => page.artists) || [], artist => artist._id), [catalogue.data]);
  const moodQuery = useDiscoveryQuery<{ tracks: LibraryTrack[] }>(`/api/discover/moods?mood=${mood || ''}&limit=60`, Boolean(mood) && !isSearch);
  const searchQuery = useDiscoveryQuery<SearchResults>(`/api/search?${new URLSearchParams({ query: search, filter: searchFilter(tab), limit: '48' })}`, search.length >= 2);
  const currentTracks = mood ? moodQuery.data?.tracks || [] : tracks;
  const catalogueTitle = mood ? DISCOVER_MOODS.find(item => item.id === mood)?.label || 'Votre ambiance' : tab === 'artists' ? 'Des artistes à rencontrer.' : tab === 'newest' ? 'Les dernières sorties.' : tab === 'tracks' ? 'Tous les sons. Toutes les envies.' : 'Poursuivez la découverte.';
  const activeQuery = mood ? moodQuery : catalogue;
  const total = catalogue.data?.pages[0]?.[tab === 'artists' ? 'totalArtists' : 'total'];
  const results = searchQuery.data;
  const resultCount = results ? results.tracks.length + results.artists.length + results.posts.length + results.playlists.length : 0;
  const searchCapped = results && Object.values(results).some(value => Array.isArray(value) && value.length >= 48);

  return <div ref={pageTop} className="discovery" data-motion={motion.enabled} data-layout={layout} data-discovery-tab={tab}>
    <header className="dl-heading"><div><p className="dl-eyebrow">Votre bibliothèque de découvertes</p><h1>Découvrir<span>.</span></h1></div><form className="dl-search" role="search" onSubmit={event => { event.preventDefault(); update({ q: draft.trim().slice(0, 120) || null }); }}><Search size={20} aria-hidden="true" /><input aria-label="Rechercher des sons, artistes, posts ou playlists" placeholder="Un son, un artiste, une envie…" type="search" value={draft} maxLength={120} onChange={event => setDraft(event.target.value)} />{draft && <button type="button" aria-label="Effacer la recherche" onClick={() => { setDraft(''); update({ q: null }); }}><X size={18} /></button>}<button type="submit" aria-label="Rechercher"><ArrowRight size={19} /></button></form></header>
    <div className="dl-toolbar"><nav className="dl-tabs" aria-label="Explorer par type de contenu">{tabs.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => chooseTab(id)}><Icon size={16} /><span>{label}</span></button>)}</nav><button className="dl-motion-toggle" type="button" disabled={motion.constrained} aria-label={motion.preferred ? 'Mettre les animations de Découvrir en pause' : 'Activer les animations de Découvrir'} aria-pressed={motion.preferred} onClick={() => motion.setEnabled(!motion.preferred)}>{motion.preferred ? <Pause size={15} /> : <Play size={15} />}<span>Ambiance</span></button></div>

    {isSearch ? <section className="dl-section dl-results" aria-label="Résultats de recherche"><SectionHeading eyebrow={tabs.find(item => item.id === tab)?.label} title={`Résultats pour « ${search} »`} />{search.length < 2 ? <Empty title="Encore un caractère…"><p>Saisissez au moins deux caractères pour rechercher.</p></Empty> : searchQuery.isPending ? <Skeleton /> : searchQuery.isError ? <Failure retry={searchQuery.refetch} /> : !resultCount ? <Empty title="Pas encore de rencontre."><p>Aucun résultat pour cette recherche. Essayez un titre, un nom ou un autre mot.</p><button type="button" onClick={() => { setDraft(''); update({ q: null }); }}>Revenir à l’exploration</button></Empty> : <><p className="dl-result-count" role="status">{resultCount} résultats{searchCapped ? ' · 48 premiers par catégorie, affinez votre recherche pour aller plus loin' : ''}</p>
      {!!results?.tracks.length && <section><h3 className="dl-result-heading">Sons</h3><div className="dl-track-grid">{results.tracks.map((track, index) => <DiscoveryTrackCard key={track._id} track={track} queue={results.tracks} index={index} />)}</div></section>}
      {!!results?.artists.length && <section><h3 className="dl-result-heading">Artistes</h3><div className="dl-artist-grid">{results.artists.map(artist => <DiscoveryArtistCard key={artist._id} artist={artist} />)}</div></section>}
      {!!results?.posts.length && <section><h3 className="dl-result-heading">Posts</h3><div className="dl-post-grid">{results.posts.map(post => <DiscoveryPostCard key={post.id} post={post} />)}</div></section>}
      {!!results?.playlists.length && <section><h3 className="dl-result-heading">Playlists</h3><div className="dl-playlist-grid">{results.playlists.map(playlist => <DiscoveryPlaylistCard key={playlist._id} playlist={playlist} />)}</div></section>}
    </>}</section> : <>
      {tab === 'explore' && !mood && <><Hero tracks={tracks} total={total || 0} onBrowse={() => chooseTab('tracks')} />{catalogue.isError && <Failure retry={catalogue.refetch} />}
        <section className="dl-moods" aria-label="Explorer les ambiances"><div className="dl-moods-heading"><span className="dl-eyebrow">Trouvez votre fréquence</span><p>Vous êtes plutôt…</p></div><div className="dl-moods-grid">{DISCOVER_MOODS.map((item, i) => <button type="button" key={item.id} onClick={() => { setMood(item.id); returnToTop(); }} className={`dl-mood dl-mood--${i}`}><span className="dl-mood-art" aria-hidden="true">{i % 3 === 0 ? <Moon /> : i % 3 === 1 ? <Music2 /> : <Zap />}</span><span>{item.label}</span><ArrowUpRight size={15} /></button>)}</div></section>
        <section className="dl-section"><SectionHeading eyebrow="La sélection du moment" title="En rotation." onAction={() => chooseTab('tracks')} />{catalogue.isPending ? <Skeleton /> : tracks.length ? <div className="dl-track-grid">{tracks.slice(0, 6).map((track, index) => <DiscoveryTrackCard key={track._id} track={track} queue={tracks} index={index} />)}</div> : !catalogue.isError && <Empty />}</section>
        <Deferred><FreshSection onAll={() => chooseTab('newest')} /></Deferred>
        {!!artists.length && <section className="dl-section"><SectionHeading eyebrow="Rencontrez ceux qui font le son" title="Plus qu’une voix." onAction={() => chooseTab('artists')} /><div className="dl-artist-grid dl-artist-grid--preview">{artists.slice(0, 6).map(artist => <DiscoveryArtistCard key={artist._id} artist={artist} />)}</div></section>}
        <Deferred><PostsSection preview onAll={() => chooseTab('posts')} /></Deferred>
        <Deferred><PlaylistSection preview onAll={() => chooseTab('playlists')} /></Deferred>
        <div className="dl-detour"><Radio size={30} /><div><h2>Moins attendu.<br /><em>Plus vous.</em></h2><p>Les pépites encore discrètes, repérées par Synaura.</p></div><button type="button" onClick={() => { setMood(null); update({ tab: 'tracks', sort: 'hidden', genre: null }); returnToTop(); }}>Explorer les pépites <ArrowUpRight size={18} /></button></div>
      </>}

      {(isCatalogue || mood) && <section className="dl-section dl-catalogue" aria-label="Catalogue de découverte"><SectionHeading eyebrow={mood ? 'Votre fréquence' : tab === 'explore' ? 'Il y a encore tant à écouter' : total != null ? `${compactNumber(total)} ${tab === 'artists' ? 'artistes' : 'sons'} dans cette sélection` : 'Explorer le catalogue'} title={catalogueTitle} />
        <div className="dl-filters">{mood ? <button className="dl-filter-reset" type="button" onClick={() => setMood(null)}><X size={15} />Toutes les ambiances</button> : <><label className="dl-select">Genre<select aria-label="Filtrer par genre" value={genre} onChange={event => update({ genre: event.target.value || null })}><option value="">Tous les genres</option>{genres.map(item => <option key={item} value={item}>{genreLabel[item] || item}</option>)}</select></label>{tab !== 'newest' && <label className="dl-select">Tri<select aria-label="Trier la sélection" value={sort} onChange={event => update({ sort: event.target.value })}><option value="trending">En ce moment</option><option value="newest">Les plus récents</option><option value="popular">Les plus écoutés</option><option value="hidden">Pépites cachées</option></select></label>}</>}
          {tab !== 'artists' && <div className="dl-layout" aria-label="Présentation des sons"><button type="button" aria-label="Afficher en grille" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><Grid2X2 size={17} /></button><button type="button" aria-label="Afficher en liste" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><LayoutList size={18} /></button></div>}
        </div>
        {activeQuery.isPending ? <Skeleton /> : activeQuery.isError && !(tab === 'artists' && !mood ? artists.length : currentTracks.length) ? <Failure retry={activeQuery.refetch} /> : tab === 'artists' ? artists.length ? <div className="dl-artist-grid">{artists.map(artist => <DiscoveryArtistCard key={artist._id} artist={artist} />)}</div> : <Empty title="Aucun artiste dans cette sélection." /> : currentTracks.length ? <div className="dl-track-grid dl-catalogue-tracks">{(tab === 'explore' && !mood ? currentTracks.slice(6) : currentTracks).map((track, index) => <DiscoveryTrackCard key={track._id} track={track} queue={currentTracks} index={index} />)}</div> : <Empty />}
        {!mood && !catalogue.isPending && (tracks.length > 0 || artists.length > 0) && <More key={`${tab}:${sort}:${genre}`} hasMore={Boolean(catalogue.hasNextPage)} busy={catalogue.isFetching} error={catalogue.isFetchNextPageError} load={catalogue.fetchNextPage} count={tab === 'artists' ? artists.length : tracks.length} />}
        {mood && !!currentTracks.length && <p className="dl-selection-note">{currentTracks.length} morceaux dans cette ambiance · sélection jusqu’à 60 sons</p>}
      </section>}
      {tab === 'posts' && <PostsSection />}{tab === 'playlists' && <PlaylistSection />}
    </>}
    <footer className="dl-footer"><span>SYNAURA<span>Le son nous rapproche.</span></span><PilotLink href="/live">Retrouver mon Live <ArrowUpRight size={18} /></PilotLink></footer>
  </div>;
}
