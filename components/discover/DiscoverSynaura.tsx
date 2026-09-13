'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, MessageCircle, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import SynauraLogo from '@/components/brand/SynauraLogo';
import SynauraSonicIntro from '@/components/discover/SynauraSonicIntro';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { useProfilePeek } from '@/components/profile/useProfilePeek';
import { useCommentsSurface } from '@/components/comments/useCommentsSurface';
import { recordEntryEvent } from '@/lib/entryAnalytics';
import styles from './DiscoverSynaura.module.css';

const SONIC_INTRO_SEEN_KEY = 'synaura.sonic-intro.seen.v1';
const CHAPTERS = [
  { name: 'Seuil', title: 'La musique,\nun peu plus près.', text: 'Un morceau. Une personne. Une idée qui reste. Entre dans un espace qui les relie.' },
  { name: 'Musique', title: 'D’abord,\nressentir.', text: 'Laisse une place au morceau. Son image, sa voix, et tout ce qu’il te fait imaginer.' },
  { name: 'Découverte', title: 'Puis, suivre\nce qui résonne.', text: 'D’un son à un créateur. D’une ambiance à une autre. La découverte commence par la curiosité.' },
  { name: 'Création', title: 'Et si la prochaine\nidée était la tienne ?', text: 'Importer un morceau. Créer avec l’IA. Explorer le Studio. Tu choisis le point de départ.' },
  { name: 'Moment social', title: 'Un instant précis.\nUne histoire partagée.', text: 'La conversation accompagne la musique. Les Moments relient les mots à l’instant qui les a fait naître.' },
  { name: 'Entrer', title: 'Ce monde\nprend ta couleur.', text: 'Retrouve tes sons, garde tes découvertes et fais une place à tes créations.' },
] as const;
type EntryTrack = { _id: string; title: string; coverUrl?: string; audioUrl?: string; duration?: number; artist?: { _id?: string; username?: string; name?: string; artistName?: string } };

export default function DiscoverSynaura({ legacy = false }: { legacy?: boolean }) {
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [firstVisit, setFirstVisit] = useState(false);
  const [ready, setReady] = useState(false);
  const [showSonicIntro, setShowSonicIntro] = useState(false);
  const [entering, setEntering] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tracks, setTracks] = useState<EntryTrack[]>([]);
  const [mediaStatus, setMediaStatus] = useState<'loading' | 'ready' | 'empty'>('loading');
  const peek = useProfilePeek('other');
  const comments = useCommentsSurface('other');
  const fullExperience = firstVisit || expanded;
  const track = tracks[0];
  const artist = track?.artist?.artistName || track?.artist?.name || track?.artist?.username || 'Créateur';

  useEffect(() => {
    try {
      const forceSonicPreview = process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).get('sonicPreview') === '1';
      const seen = localStorage.getItem(SONIC_INTRO_SEEN_KEY) === '1' && !forceSonicPreview;
      setFirstVisit(!seen); setShowSonicIntro(!seen);
    } catch { setFirstVisit(true); setShowSonicIntro(true); }
    setReady(true);
    recordEntryEvent('discover_view', { legacy });
    const controller = new AbortController();
    // Public, read-only content: no fabricated creator, reaction or listening count.
    fetch('/api/tracks?limit=3', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Public selection unavailable');
      const payload = await response.json();
      if (controller.signal.aborted) return;
      const selection = (Array.isArray(payload?.tracks) ? payload.tracks : []).filter((item: EntryTrack) => item._id && item.title).slice(0, 3);
      setTracks(selection); setMediaStatus(selection.length ? 'ready' : 'empty');
    }).catch(() => { if (!controller.signal.aborted) setMediaStatus('empty'); });
    return () => controller.abort();
  }, [legacy]);

  useEffect(() => {
    const root = rootRef.current, stage = stageRef.current;
    const scroller = root?.closest('.app-scroll-container');
    if (!root || !stage || !scroller) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = Math.max(1, root.offsetHeight - stage.offsetHeight);
      const progress = fullExperience ? Math.min(1, Math.max(0, (scroller.getBoundingClientRect().top - root.getBoundingClientRect().top) / distance)) : 0;
      // Scroll changes presentation only: no audio start, seek or queue mutation.
      stage.style.setProperty('--entry-progress', String(reduced ? 0 : progress));
      const next = Math.min(5, Math.floor(progress * 6));
      if (chapterRef.current !== next) { chapterRef.current = next; setChapter(next); }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    scroller.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule); observer.observe(stage); update();
    return () => { scroller.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); observer.disconnect(); cancelAnimationFrame(frame); };
  }, [fullExperience, reduced]);

  const enter = () => {
    if (entering) return;
    setEntering(true); recordEntryEvent('enter_click', { source: legacy ? 'legacy_landing' : 'discover' }); router.push('/enter');
  };
  const completeSonicIntro = (reason: 'sound' | 'silent' | 'skip') => {
    try { localStorage.setItem(SONIC_INTRO_SEEN_KEY, '1'); } catch {}
    setShowSonicIntro(false); recordEntryEvent('sonic_intro_dismiss', { reason });
  };
  const goToChapter = (index: number) => {
    const root = rootRef.current, scroller = root?.closest('.app-scroll-container');
    if (!root || !scroller || !stageRef.current) return;
    const start = scroller.scrollTop + root.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTo({ top: start + (root.offsetHeight - stageRef.current.offsetHeight) * (index / 6 + 0.02), behavior: reduced ? 'instant' : 'smooth' });
  };

  return (
    <section ref={rootRef} className={`v2-entry ${styles.root}`} data-first-visit={ready && firstVisit || undefined} data-full-experience={fullExperience} data-reduced={reduced} aria-label="Entrer dans Synaura">
      <SynauraSonicIntro open={ready && showSonicIntro} onComplete={completeSonicIntro} />
      <div ref={stageRef} className={styles.stage} data-chapter={chapter} aria-hidden={ready && showSonicIntro || undefined}>
        <header className={styles.header}>
          <Link href="/" aria-label="Synaura, accueil"><SynauraLogo variant="wordmark" size={44} priority decorative /></Link>
          <nav aria-label="Navigation de découverte"><Link className={styles.discoveryLink} href="/discover">Explorer la musique</Link><button onClick={() => setShowSonicIntro(true)} aria-label="Rejouer la signature Synaura"><Volume2 size={18} /></button><Link href="/auth/signin">Se connecter <ArrowRight size={15} /></Link></nav>
        </header>
        <div className={styles.light} aria-hidden />
        <div className={styles.artStage}>
          <figure className={styles.artwork}>
            {track ? <SynauraImage src={track.coverUrl} alt={`Pochette de ${track.title}`} fetchPriority="high" /> : <div className={styles.artFallback} aria-label={mediaStatus === 'loading' ? 'Chargement de la sélection musicale' : 'Sélection musicale indisponible'}><span>Un espace<br />pour la musique.</span></div>}
            {track && <figcaption><span>Sélection publique</span><Link href={`/track/${encodeURIComponent(track._id)}`}>{track.title} <ArrowRight size={15} /></Link><button onClick={event => peek(track.artist?.username, event.currentTarget)} disabled={!track.artist?.username}>{artist}</button></figcaption>}
          </figure>
          <div className={styles.satellites} aria-hidden={chapter !== 2} ref={element => { if (element) element.inert = chapter !== 2; }}>
            {tracks.slice(1).map(item => <Link href={`/track/${encodeURIComponent(item._id)}`} key={item._id}><SynauraImage src={item.coverUrl} alt={item.title} loading="lazy" /><span>{item.title}</span></Link>)}
          </div>
          <div className={styles.creation} aria-hidden={chapter !== 3} ref={element => { if (element) element.inert = chapter !== 3; }}>
            <p>De l’intention au morceau</p><Link href="/ai-generator"><span>01</span> Faire naître une idée <ArrowRight size={16} /></Link><Link href="/studio"><span>02</span> Ouvrir le Studio <ArrowRight size={16} /></Link><Link href="/upload"><span>03</span> Publier ma musique <ArrowRight size={16} /></Link>
          </div>
          <div className={styles.social} aria-hidden={chapter !== 4} ref={element => { if (element) element.inert = chapter !== 4; }}>
            <MessageCircle size={22} strokeWidth={1.4} /><p>Les mots trouvent<br />leur place dans le son.</p>
            {track ? <button onClick={event => comments({ type: 'track', id: track._id, title: track.title, artist, coverUrl: track.coverUrl, audioUrl: track.audioUrl, duration: track.duration, creatorId: track.artist?._id }, event.currentTarget)}>Ouvrir la conversation <ArrowRight size={15} /></button> : <Link href="/discover">Découvrir les morceaux <ArrowRight size={15} /></Link>}
          </div>
        </div>
        <div className={styles.narrative}>
          {CHAPTERS.map((item, index) => <section key={item.name} className={styles.chapter} data-active={chapter === index} aria-hidden={chapter !== index}><p className={styles.eyebrow}>{String(index + 1).padStart(2, '0')} / Synaura · {item.name}</p>{index === 0 ? <h1>{item.title}</h1> : <h2>{item.title}</h2>}<p className={styles.description}>{item.text}</p></section>)}
          <div className={styles.cta}><button className="v2-action v2-action-primary" onClick={enter} disabled={entering}>{entering ? 'Ouverture…' : 'Entrer dans Synaura'} <ArrowRight size={17} /></button>{!fullExperience && <button className={styles.explore} onClick={() => setExpanded(true)}>Revivre la découverte <ArrowDown size={15} /></button>}</div>
        </div>
        <footer className={styles.footer}>
          {fullExperience ? <nav aria-label="Chapitres de l’entrée">{CHAPTERS.map((item, index) => <button key={item.name} onClick={() => goToChapter(index)} aria-label={`${index + 1}. ${item.name}`} aria-current={chapter === index ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><span>{item.name}</span></button>)}</nav> : <p>Heureux de te retrouver.</p>}
          <span className={styles.scrollCue}>{fullExperience ? <>Défiler pour entrer <ArrowDown size={14} /></> : 'L’écoute commence par un choix.'}</span>
        </footer>
      </div>
    </section>
  );
}
