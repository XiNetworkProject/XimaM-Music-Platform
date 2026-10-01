'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, ArrowUpRight, Headphones, Check, ChevronDown, Heart, Loader2, MessageCircle, Music2, Pause, PenLine, Play, RefreshCw, Search, Send, Share2, Sparkles, Users, X, Zap } from 'lucide-react';
import Link from '@/components/navigation/HandoffLink';
import Avatar from '@/components/Avatar';
import TrackCover from '@/components/TrackCover';
import ExperienceMotionFrame from '@/components/ambient/ExperienceMotionFrame';
import { SynauraAppShell } from '@/components/synaura/SynauraShell';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';
import { COMMUNITY_CLUBS, composeHref } from '@/lib/communityClubs';
import { COMMUNITY_FILTERS, COMMUNITY_OTHER_CATEGORIES, communityCategory, communityCategoryLabel, communityDate, communityParticipants, communityPostHref, communitySort, type CommunityPost } from '@/lib/communityFeed';
import { useCommunityFeed } from './useCommunityFeed';
import './community-hub.css';

const INTENTIONS = {
  feedback: { Icon: Headphones, title: 'Un avis sur ton son', detail: 'Une autre oreille fait la différence.', action: 'Demander un avis' },
  collab: { Icon: Users, title: 'La bonne rencontre', detail: 'Une voix, une prod, une nouvelle idée.', action: 'Chercher une collab' },
  remix: { Icon: Zap, title: 'Ta version de l’histoire', detail: 'Un morceau. D’autres possibilités.', action: 'Proposer un remix' },
  ai: { Icon: Sparkles, title: 'Le labo des idées', detail: 'Prompts, essais et trouvailles IA.', action: 'Partager une idée' },
} as const;

function DiscussionCard({ post, publicPreview }: { post: CommunityPost; publicPreview: boolean }) {
  const { data: session } = useSession();
  const { audioState, setQueueAndPlay, play, pause } = useAudioPlayer();
  const [liked, setLiked] = useState(Boolean(post.is_liked));
  const [likes, setLikes] = useState(Number(post.likes_count || 0));
  const [pendingLike, setPendingLike] = useState(false);
  const likeLock = useRef(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (copyTimer.current) clearTimeout(copyTimer.current); }; }, []);
  const author = post.author;
  const track = post.track;
  const href = communityPostHref(post.id, publicPreview);
  const external = publicPreview ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const current = Boolean(track?.id && audioState.tracks[audioState.currentTrackIndex]?._id === track.id);
  const playing = current && audioState.isPlaying;
  const toggleLike = async () => {
    if (publicPreview || likeLock.current) return;
    if (!session?.user?.id) { notify.info('Connexion requise', 'Connecte-toi pour aimer cette discussion.'); return; }
    likeLock.current = true;
    setPendingLike(true);
    try {
      const response = await fetch(liked ? `/api/community/posts/likes?post_id=${encodeURIComponent(post.id)}` : '/api/community/posts/likes', {
        method: liked ? 'DELETE' : 'POST',
        ...(liked ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: post.id }) }),
      });
      if (!response.ok) throw new Error('Like failed');
      if (mounted.current) { setLikes((count) => Math.max(0, count + (liked ? -1 : 1))); setLiked(!liked); }
    } catch { if (mounted.current) notify.error('Réaction', 'Ton choix n’a pas été enregistré. Réessaie.'); }
    finally { likeLock.current = false; if (mounted.current) setPendingLike(false); }
  };
  const playTrack = () => {
    if (!track?.id || !(track.audioUrl || track.audio_url)) return;
    if (current) { playing ? pause() : play(); return; }
    setQueueAndPlay([{
      _id: track.id, title: track.title || 'Son partagé',
      artist: { _id: track.artist_id || '', name: track.artist_name || 'Artiste', username: track.artist_username || '' },
      audioUrl: track.audioUrl || track.audio_url || '', coverUrl: track.coverUrl || track.cover_url || '/default-cover.svg',
      coverVideoUrl: track.coverVideoUrl, coverVideoPosterUrl: track.coverVideoPosterUrl,
      duration: track.duration || 0, likes: [], comments: [], plays: track.plays || 0, genre: track.genre || [],
    }], 0);
  };
  const share = async () => {
    const url = communityPostHref(post.id, true);
    try {
      if (navigator.share) await navigator.share({ title: post.title, url });
      else { await navigator.clipboard.writeText(url); if (!mounted.current) return; setCopied(true); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 2500); }
    } catch (error) { if ((error as Error)?.name !== 'AbortError') notify.error('Partage', 'Le partage n’est pas disponible dans ce navigateur.'); }
  };
  return <article className="community-discussion" aria-labelledby={`discussion-${post.id}`}>
    <div className="community-discussion-byline">
      {author?.username ? <Link href={`${publicPreview ? 'https://synaura.fr' : ''}/profile/${encodeURIComponent(author.username)}`} {...external} className="community-author" aria-label={`Profil de ${author.name || author.username}`}>
        <Avatar src={author.avatar} name={author.name} username={author.username} size="md" /><span><strong>{author.name || author.username}</strong><small>@{author.username}</small></span>
      </Link> : <div className="community-author"><Avatar name={author?.name || '?'} size="md" /><span><strong>{author?.name || 'Membre Synaura'}</strong><small>Profil non disponible</small></span></div>}
      <time dateTime={post.created_at}>{communityDate(post.created_at)}</time>
    </div>
    <span className="community-topic" data-topic={post.category}>{communityCategoryLabel(post.category)}</span>
    <h3 id={`discussion-${post.id}`}><Link href={href} {...external}>{post.title || 'Discussion'}</Link></h3>
    <p className="community-excerpt">{post.content}</p>
    {track && <div className="community-shared-track" data-playing={playing}>
      <div className="community-track-cover"><TrackCover src={track.coverUrl || track.cover_url} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} title={track.title} autoPlayVideo={false} /></div>
      <Link href={`${publicPreview ? 'https://synaura.fr' : ''}/track/${encodeURIComponent(track.id)}`} {...external} className="community-track-info"><small>Son partagé</small><strong>{track.title || 'Son sans titre'}</strong><span>{track.artist_name || 'Artiste Synaura'}</span></Link>
      <button type="button" onClick={playTrack} disabled={!(track.audioUrl || track.audio_url)} aria-label={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title || 'le son partagé'}`} className="community-track-play">{playing ? <Pause size={18} /> : <Play size={18} />}</button>
    </div>}
    {Boolean(post.tags?.length) && <ul className="community-post-tags" aria-label="Mots-clés">{Array.from(new Set(post.tags)).slice(0, 3).map((tag) => <li key={tag}>#{tag}</li>)}</ul>}
    <footer className="community-discussion-actions">
      <button type="button" onClick={toggleLike} aria-pressed={liked} disabled={pendingLike || publicPreview} aria-label={`${liked ? 'Retirer mon j’aime' : 'Aimer la discussion'} : ${post.title}`} title={publicPreview ? 'Aperçu public en lecture seule' : undefined}><Heart size={19} fill={liked ? 'currentColor' : 'none'} /><span>{likes}</span></button>
      <Link href={href} {...external} className="community-reply" aria-label={`Répondre à ${post.title} · ${post.replies_count || 0} réponses`}><MessageCircle size={19} /><span>{post.replies_count || 0}</span><span className="community-reply-label">Répondre</span></Link>
      <button type="button" onClick={share} aria-label={`Partager ${post.title}`} className="community-share">{copied ? <Check size={18} /> : <Share2 size={18} />}<span className="sr-only" role="status">{copied ? 'Lien copié' : ''}</span></button>
    </footer>
  </article>;
}

export default function CommunityHub({ forum = false }: { forum?: boolean }) {
  const params = useSearchParams();
  const { data: session } = useSession();
  const [category, setCategory] = useState(() => communityCategory(params.get('category')));
  const [sort, setSort] = useState(() => communitySort(params.get('sort')));
  const [query, setQuery] = useState(params.get('search') || '');
  const [search, setSearch] = useState(query);
  const [intentions, setIntentions] = useState<string[]>([]);
  useEffect(() => { const timer = setTimeout(() => setSearch(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { setCategory(communityCategory(params.get('category'))); setSort(communitySort(params.get('sort'))); setQuery(params.get('search') || ''); }, [params]);
  useEffect(() => {
    if (!session?.user?.id) { setIntentions([]); return; }
    const controller = new AbortController();
    fetch('/api/user/preferences', { cache: 'no-store', signal: controller.signal }).then((r) => r.ok ? r.json() : null).then((data) => {
      if (controller.signal.aborted) return;
      const values = data?.preferences?.onboarding?.creatorIntentions;
      setIntentions(Array.isArray(values) ? values : []);
    }).catch(() => {});
    return () => controller.abort();
  }, [session?.user?.id]);
  const orderedClubs = useMemo(() => {
    const preferred = intentions.map((value) => ({ remix: 'remix', collab: 'collab', create_ai: 'ai' })[value as 'remix' | 'collab' | 'create_ai']);
    return [...COMMUNITY_CLUBS].sort((a, b) => Number(preferred.includes(b.slug)) - Number(preferred.includes(a.slug)));
  }, [intentions]);
  const feed = useCommunityFeed(category, search, sort, session?.user?.id || '');
  const people = communityParticipants(feed.posts);
  const reset = () => { setCategory('all'); setQuery(''); setSearch(''); };
  const composingClub = COMMUNITY_CLUBS.find((club) => club.category === category);
  return <SynauraAppShell contentClassName="max-w-[1300px]">
    <div className="community-hub">
      <header className="community-welcome">
        <div><p className="community-eyebrow"><Users size={14} /> Communauté Synaura</p><h1>{forum ? <>Toutes les voix.<br /><span>La même passion.</span></> : <>La musique,<br /><span>ensemble.</span></>}</h1><p className="community-intro">Un son à partager. Un avis qui aide.<br />La prochaine personne avec qui créer.</p></div>
        <div className="community-welcome-right"><ExperienceMotionFrame className="community-constellation"><div aria-hidden="true"><i /><i /><i /><span><Music2 size={26} /></span><span><MessageCircle size={20} /></span><span><Sparkles size={20} /></span></div></ExperienceMotionFrame><Link href="/community/forum/new" className="community-primary"><PenLine size={17} /> Lancer une discussion <ArrowUpRight size={17} /></Link></div>
      </header>

      <section className="community-intentions" aria-label="Qu’aimerais-tu faire ?">
        {orderedClubs.map((club) => { const intent = INTENTIONS[club.slug]; const Icon = intent.Icon; return <Link key={club.slug} href={composeHref(club)} className="community-intention" data-intent={club.slug}><Icon size={23} strokeWidth={1.5} /><h2>{intent.title}</h2><p>{intent.detail}</p><span>{intent.action}<ArrowUpRight size={14} /></span></Link>; })}
      </section>

      <div className="community-layout">
        <section className="community-feed" aria-labelledby="community-feed-title">
          <div className="community-feed-heading"><div><p className="community-eyebrow">Le fil de la communauté</p><h2 id="community-feed-title">On en parle ici.</h2></div><button type="button" className="community-icon-button" onClick={feed.reload} disabled={feed.loading} aria-label="Actualiser les discussions"><RefreshCw size={18} className={feed.loading ? 'community-spin' : ''} /></button></div>
          <div className="community-filter-bar" aria-label="Filtrer les discussions">
            {COMMUNITY_FILTERS.map((filter) => <button key={filter.category} type="button" aria-pressed={category === filter.category} onClick={() => setCategory(filter.category)}>{filter.label}</button>)}
            <label className="community-more-filter"><span className="sr-only">Autres thèmes</span><select value={COMMUNITY_OTHER_CATEGORIES.some(([key]) => key === category) ? category : ''} onChange={(event) => setCategory(event.target.value || 'all')}><option value="">Autres thèmes</option>{COMMUNITY_OTHER_CATEGORIES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><ChevronDown size={12} aria-hidden="true" /></label>
          </div>
          <div className="community-feed-tools">
            <div className="community-search"><Search size={17} aria-hidden="true" /><input type="search" maxLength={120} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher dans les discussions" placeholder="Chercher une discussion…" />{query && <button type="button" onClick={() => { setQuery(''); setSearch(''); }} aria-label="Effacer la recherche"><X size={15} /></button>}</div>
            <label className="community-sort"><span className="sr-only">Trier les discussions</span><select value={sort} onChange={(e) => setSort(communitySort(e.target.value))}><option value="recent">Récentes</option><option value="popular">Les plus aimées</option><option value="most_replied">Les plus discutées</option></select><ChevronDown size={13} aria-hidden="true" /></label>
          </div>
          {feed.publicPreview && <p className="community-preview-note">Aperçu local en lecture seule · vraies discussions de synaura.fr. Ouvrir un échange mène au site publié.</p>}
          <div className="community-posts" aria-busy={feed.loading}>
            {feed.loading && !feed.posts.length ? <div className="community-loading" role="status"><Loader2 size={22} className="community-spin" /><p>On rassemble les discussions…</p><div /><div /></div> : feed.posts.map((post) => <DiscussionCard key={`${feed.key}:${feed.publicPreview}:${post.id}`} post={post} publicPreview={feed.publicPreview} />)}
            {feed.error && <div className="community-empty" role="alert"><MessageCircle size={27} /><h3>Les discussions ne sont pas accessibles.</h3><p>Ce n’est pas un fil vide : le chargement a échoué.</p><button type="button" onClick={feed.retry}>Réessayer <RefreshCw size={15} /></button></div>}
            {!feed.loading && !feed.error && !feed.posts.length && <div className="community-empty"><MessageCircle size={30} /><h3>{search ? 'Pas de discussion pour cette recherche.' : 'La conversation peut commencer avec toi.'}</h3><p>{search ? 'Essaie un autre mot ou explore tous les thèmes.' : 'Une question précise ou un morceau à partager : il n’en faut pas plus.'}</p><div><button type="button" onClick={reset}>Voir toutes les discussions</button><Link href={composingClub ? composeHref(composingClub) : '/community/forum/new'}>Ouvrir la discussion <ArrowUpRight size={15} /></Link></div></div>}
          </div>
          {feed.hasMore && !feed.error && <button type="button" className="community-load-more" disabled={feed.loading} onClick={feed.loadMore}>{feed.loading ? <Loader2 size={17} className="community-spin" /> : <ChevronDown size={17} />}{feed.loading ? 'Chargement…' : 'Voir plus de discussions'}</button>}
          {!feed.loading && !feed.error && feed.posts.length > 0 && !feed.hasMore && <p className="community-end">Tu as parcouru les discussions de cette sélection.</p>}
        </section>

        <aside className="community-sidebar" aria-label="Les liens de la communauté">
          <section className="community-start"><span className="community-side-icon"><Send size={21} /></span><p className="community-eyebrow">Le premier pas</p><h2>Fais écouter.<br />Fais connaissance.</h2><p>Partage ce que tu crées et le retour que tu cherches. Ou donne un coup de main sur le projet de quelqu’un.</p><Link href="/community/forum/new?category=feedback">Partager un son <ArrowUpRight size={16} /></Link></section>
          {people.length > 0 && <section className="community-people"><h2>Dans les discussions</h2><p>Des profils à découvrir, au fil des échanges.</p>{people.map((author) => <Link key={author.username} href={`${feed.publicPreview ? 'https://synaura.fr' : ''}/profile/${encodeURIComponent(author.username!)}`} {...(feed.publicPreview ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><Avatar src={author.avatar} name={author.name} username={author.username} size="sm" /><span><strong>{author.name || author.username}</strong><small>@{author.username}</small></span><ArrowUpRight size={15} /></Link>)}</section>}
          <section className="community-clubs-list"><h2>Trouve ton coin</h2>{COMMUNITY_CLUBS.map((club) => { const Icon = INTENTIONS[club.slug].Icon; return <Link href={`/community/${club.slug}`} key={club.slug}><Icon size={18} /><span>{club.name}<small>{club.promise}</small></span><ArrowRight size={14} /></Link>; })}</section>
          <Link href="/messages?tab=contacts" className="community-side-link"><MessageCircle size={19} /><span>Continuer en privé<small>Messages et contacts</small></span><ArrowUpRight size={16} /></Link>
          <Link href="/city" className="community-side-link"><Zap size={19} /><span>Les rendez-vous Synaura<small>City & événements</small></span><ArrowUpRight size={16} /></Link>
          <nav className="community-useful" aria-label="Ressources communauté"><Link href="/posts">Posts des créateurs</Link><Link href="/community/faq">Questions fréquentes</Link><Link href="/partnerships">Collaborer avec Synaura</Link>{!forum && <Link href="/community/forum">Toutes les discussions</Link>}</nav>
          <p className="community-kindness">Des retours utiles. Du respect. De la place pour chaque façon de créer.</p>
        </aside>
      </div>
    </div>
  </SynauraAppShell>;
}
