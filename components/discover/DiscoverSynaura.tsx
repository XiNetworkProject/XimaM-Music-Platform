'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight, Compass, Headphones, Music2, Pause, Sparkles, UploadCloud, Users, Volume2, VolumeX, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SynauraButton, SynauraIconButton } from '@/components/ui/SynauraPrimitives';
import { DISCOVER_DEMO } from '@/lib/discoverDemo';
import { recordEntryEvent } from '@/lib/entryAnalytics';
import { playSynauraEntrySignature } from '@/lib/ui/entrySound';
import styles from './DiscoverSynaura.module.css';

const SEEN_KEY = 'synaura.discover.seen.v1';
const WAVE_HEIGHTS = [22, 42, 30, 58, 38, 70, 48, 82, 54, 68, 36, 76, 46, 64, 28, 52, 40, 72, 34, 60, 26, 48, 32, 66];

function DiscoverHeader({ muted, onMute }: { muted: boolean; onMute: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-[var(--syn-z-header)] px-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] px-3 py-2 shadow-[var(--syn-shadow-low)] backdrop-blur-2xl">
        <Link href="/" className="flex items-center gap-2 rounded-full pr-2 font-black tracking-tight" aria-label="Synaura, accueil">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--syn-soft)]">
            <Image src="/favicon.svg" alt="" width={25} height={25} priority />
          </span>
          <span>Synaura</span>
        </Link>
        <nav aria-label="Navigation de découverte" className="flex items-center gap-1">
          <a href="#experience" className="syn-interactive hidden min-h-9 items-center rounded-full px-3 text-xs font-black text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft)] hover:text-[var(--syn-text-primary)] sm:inline-flex">Découvrir</a>
          <SynauraIconButton label={muted ? 'Activer la signature sonore' : 'Couper la signature sonore'} variant="ghost" onClick={onMute}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </SynauraIconButton>
          <Link href="/enter" className="syn-interactive inline-flex min-h-9 items-center rounded-full bg-[var(--syn-contrast-bg)] px-4 text-xs font-black text-[var(--syn-contrast-text)]">Entrer</Link>
        </nav>
      </div>
    </header>
  );
}

function AuraStage({ reduced }: { reduced: boolean }) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.5], [0, reduced ? 0 : 110]);
  const opacity = useTransform(scrollYProgress, [0, 0.32], [1, 0.32]);
  return (
    <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ y, opacity }}>
      <div className={styles.orbit} />
      <div className={styles.aura} />
    </motion.div>
  );
}

function DemoPlayer() {
  return (
    <div className={styles.playerCard} aria-label="Démonstration d'un morceau et de ses réactions">
      <div className={styles.cover}>
        <div className="absolute inset-x-5 bottom-5 z-10 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">En train de vivre</p>
          <p className="mt-1 text-2xl font-black tracking-tight">{DISCOVER_DEMO.track.title}</p>
          <p className="text-sm font-bold text-white/60">{DISCOVER_DEMO.track.artist}</p>
        </div>
      </div>
      <div className={styles.waveform} aria-label="Forme d'onde simulée">
        {WAVE_HEIGHTS.map((height, index) => <span key={index} style={{ height, animationDelay: `${index * 45}ms` }} />)}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs font-black text-[var(--syn-text-secondary)]">
        <span className="inline-flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)]"><Pause className="h-3.5 w-3.5" /></span> 0:47</span>
        <span>{DISCOVER_DEMO.track.duration}</span>
      </div>
      {DISCOVER_DEMO.track.reactions.map((reaction, index) => (
        <div key={reaction.at} className={styles.reaction} style={{ right: `${index * 8 - 2}%`, top: `${15 + index * 28}%` }}>
          <Sparkles className="h-3 w-3 text-[var(--syn-accent-coral)]" /> {reaction.at} · {reaction.label}
        </div>
      ))}
    </div>
  );
}

function CreatorScene() {
  return (
    <div className={styles.creatorStack} aria-label="Démonstration de profils créateurs">
      {DISCOVER_DEMO.creators.map((creator, index) => (
        <div key={creator.name} className={styles.creatorCard}>
          <span className={styles.avatar}>{creator.initials}</span>
          <span className="min-w-0"><strong className="block truncate text-base">{creator.name}</strong><span className="text-sm text-[var(--syn-text-secondary)]">{creator.role}</span></span>
          <span className="ml-auto text-xs font-black text-[var(--syn-accent)]">{index === 2 ? 'ton monde' : 'suivre'}</span>
        </div>
      ))}
    </div>
  );
}

function CreationScene() {
  return (
    <div className={styles.creationCard} aria-label="Démonstration du Studio Synaura">
      <div className={styles.studioPanel}>
        <div className={styles.studioRail}><span /><span /><span /></div>
        <div className={styles.studioBody}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Studio · une idée prend forme</p>
          <h3 className="mt-3 text-2xl font-black tracking-tight">Décris une couleur. Fais naître un son.</h3>
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className={`${styles.promptLine} w-full`} />
            <div className={`${styles.promptLine} w-4/5`} />
            <div className={`${styles.promptLine} w-2/3`} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[['IA', Wand2], ['Publier', UploadCloud], ['Partager', Users]].map(([label, Icon]) => (
              <span key={String(label)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-black"><Icon className="h-3.5 w-3.5" /> {String(label)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorldScene() {
  return (
    <div className={styles.worldCard} aria-label="Démonstration de l'univers personnel">
      <div className="mb-5 flex items-center justify-between"><span><span className="block text-xs font-black uppercase tracking-[0.18em] text-[var(--syn-accent-blue)]">Pour toi</span><strong className="mt-1 block text-2xl tracking-tight">Ton monde se précise.</strong></span><Compass className="h-5 w-5 text-[var(--syn-text-secondary)]" /></div>
      <div className={styles.worldRows}>
        {DISCOVER_DEMO.worlds.map((world, index) => <div key={world} className={styles.worldRow}><span className={styles.worldCover} style={{ filter: `hue-rotate(${index * 42}deg)` }} /><span><strong className="block text-sm">{world}</strong><span className="text-xs text-[var(--syn-text-secondary)]">sons, playlists et créateurs</span></span><Music2 className="ml-auto h-4 w-4 text-[var(--syn-text-secondary)]" /></div>)}
      </div>
    </div>
  );
}

export default function DiscoverSynaura({ legacy = false }: { legacy?: boolean }) {
  const router = useRouter();
  const reduced = Boolean(useReducedMotion());
  const [firstVisit, setFirstVisit] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY) === '1';
      setFirstVisit(!seen);
      localStorage.setItem(SEEN_KEY, '1');
    } catch {}
    setReady(true);
    recordEntryEvent('discover_view', { legacy });
  }, [legacy]);

  const intro = useMemo(() => firstVisit && !reduced ? { duration: 0.9, delay: 0.08 } : { duration: 0.32, delay: 0 }, [firstVisit, reduced]);

  const enter = async () => {
    if (entering) return;
    setEntering(true);
    recordEntryEvent('enter_click', { source: legacy ? 'legacy_landing' : 'discover' });
    await playSynauraEntrySignature({ muted, reducedMotion: reduced });
    router.push('/enter');
  };

  return (
    <main className={styles.root} data-first-visit={ready && firstVisit || undefined}>
      <DiscoverHeader muted={muted} onMute={() => setMuted((value) => !value)} />
      <div className={styles.grain} aria-hidden />
      <section className={styles.hero} aria-labelledby="discover-title">
        <AuraStage reduced={reduced} />
        <motion.div className={styles.heroCopy} initial={{ opacity: 0, y: reduced ? 0 : 24 }} animate={{ opacity: ready ? 1 : 0, y: 0 }} transition={intro}>
          <motion.div className={styles.logoStage} initial={{ scale: firstVisit && !reduced ? 1.5 : 1, opacity: 0 }} animate={{ scale: 1, opacity: ready ? 1 : 0 }} transition={{ duration: firstVisit && !reduced ? 1 : 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <Image src="/favicon.svg" alt="" width={112} height={112} className="h-[68%] w-[68%]" priority />
          </motion.div>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.28em] text-[var(--syn-text-secondary)]">Écoute · crée · partage</p>
          <h1 id="discover-title" className={`${styles.wordmark} mt-5`}>Synaura</h1>
          <p className={styles.heroLead}>La musique ne devrait pas seulement se lancer. Elle devrait rapprocher, surprendre et laisser une trace.</p>
          <div className={styles.ctaRow}>
            <SynauraButton size="lg" variant="primary" onClick={() => void enter()} loading={entering}>Entrer dans Synaura <ArrowRight className="h-4 w-4" /></SynauraButton>
            <Link href="/auth/signin" className="syn-interactive inline-flex min-h-12 items-center rounded-full px-5 text-sm font-black text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft)] hover:text-[var(--syn-text-primary)]">J’ai déjà un compte</Link>
          </div>
          <p className="mt-3 text-xs text-[var(--syn-text-secondary)]">La signature sonore ne joue qu’après ton clic. {muted ? 'Elle est coupée.' : 'Tu peux la couper en haut.'}</p>
        </motion.div>
        <a href="#experience" className={styles.scrollCue}><ArrowDown className="h-4 w-4" /> Explorer</a>
      </section>

      <div id="experience" className={styles.story}>
        <section className={styles.scene} aria-labelledby="scene-listen">
          <div><p className={styles.eyebrow}>Un son, maintenant</p><h2 id="scene-listen" className={styles.sceneTitle}>Écouter devient un lieu.</h2><p className={styles.sceneText}>Une waveform, des réactions au bon instant, une Aura qui respire avec le morceau. La musique reste au centre ; les gens apparaissent autour.</p></div>
          <div className={styles.sceneVisual}><DemoPlayer /></div>
        </section>

        <section className={styles.scene} aria-labelledby="scene-people">
          <div><p className={styles.eyebrow}>Autour de la musique</p><h2 id="scene-people" className={styles.sceneTitle}>Quelqu’un écoute avec toi.</h2><p className={styles.sceneText}>Créateurs, profils, commentaires temporels et partages donnent une histoire à chaque morceau — sans interrompre l’écoute.</p></div>
          <div className={styles.sceneVisual}><CreatorScene /></div>
        </section>

        <section className={styles.scene} aria-labelledby="scene-create">
          <div><p className={styles.eyebrow}>Quand l’idée arrive</p><h2 id="scene-create" className={styles.sceneTitle}>Elle peut devenir un son.</h2><p className={styles.sceneText}>Crée avec l’IA, publie tes propres morceaux, imagine une variation ou accompagne-les d’un post. Le Studio ouvre la porte ; tu gardes la direction.</p></div>
          <div className={styles.sceneVisual}><CreationScene /></div>
        </section>

        <section className={styles.scene} aria-labelledby="scene-world">
          <div><p className={styles.eyebrow}>À force d’écouter</p><h2 id="scene-world" className={styles.sceneTitle}>Ton monde prend une couleur.</h2><p className={styles.sceneText}>Bibliothèque, playlists, découvertes et recommandations se rassemblent autour de ce qui te fait vibrer.</p></div>
          <div className={styles.sceneVisual}><WorldScene /></div>
        </section>
      </div>

      <section className={styles.finale} aria-labelledby="discover-finale">
        <div className="relative z-10 max-w-3xl">
          <Headphones className="mx-auto h-7 w-7 text-[var(--syn-accent-coral)]" />
          <h2 id="discover-finale" className={`${styles.sceneTitle} mt-5`}>Le reste commence quand tu entres.</h2>
          <p className={`${styles.sceneText} mx-auto`}>Quelques choix, puis Synaura s’ouvre sur ton univers musical.</p>
          <div className={styles.ctaRow}><SynauraButton size="lg" variant="accent" onClick={() => void enter()} loading={entering}>Entrer dans Synaura <ArrowRight className="h-4 w-4" /></SynauraButton></div>
        </div>
      </section>
    </main>
  );
}
