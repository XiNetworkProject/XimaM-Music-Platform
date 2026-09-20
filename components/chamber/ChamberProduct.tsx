'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from '@/components/navigation/HandoffLink';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, Search } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import ChamberListening from './ChamberListening';
import { CHAMBER_CHAPTERS, LAST_CHAMBER_CHAPTER, chapterAtScroll, progressAtScroll } from './chamberStory';
import './chamber-product.css';
import './chamber-story.css';

const ChamberMaterial = dynamic(() => import('./ChamberMaterial'), { ssr: false });

export default function ChamberProduct({ presentationHref }: { presentationHref?: string } = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<Array<HTMLElement | null>>([]);
  const [entered, setEntered] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(true);
  const [pulse, setPulse] = useState(0);
  const [ready, setReady] = useState(false);
  const { audioState } = useAudioPlayer();

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPaused(preference.matches);
    update();
    setReady(true);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        // Use actual offsets: short windows/zoom can make copy taller than one
        // viewport. Scrolling, touch and keyboard all remain browser-native.
        const panels = panelsRef.current;
        let lower = 0;
        for (let i = 1; i < panels.length; i += 1) {
          if (panels[i] && root.scrollTop >= panels[i]!.offsetTop) lower = i;
        }
        const start = panels[lower]?.offsetTop || 0;
        const end = panels[lower + 1]?.offsetTop;
        const position = end == null ? lower : lower + Math.max(0, Math.min(1, (root.scrollTop - start) / Math.max(1, end - start)));
        const nextChapter = chapterAtScroll(position, 1);
        setChapter(nextChapter);
        setProgress(Math.round(progressAtScroll(position, 1) * 1000) / 1000);
        if (nextChapter === LAST_CHAMBER_CHAPTER) setEntered(true);
      });
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(root);
    panelsRef.current.forEach(panel => { if (panel) observer.observe(panel); });
    onScroll();
    return () => { root.removeEventListener('scroll', onScroll); observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  const goToChapter = useCallback((index: number) => {
    const next = Math.max(0, Math.min(LAST_CHAMBER_CHAPTER, index));
    const panel = panelsRef.current[next];
    if (!panel) return;
    if (next === LAST_CHAMBER_CHAPTER) setEntered(true);
    // Explicit navigation moves focus into the chosen chapter, never the player.
    panel.focus({ preventScroll: true });
    rootRef.current?.scrollTo({ top: panel.offsetTop, behavior: paused ? 'instant' : 'smooth' });
  }, [paused]);
  const toggleMotion = useCallback(() => setPaused(value => !value), []);
  const listening = chapter === LAST_CHAMBER_CHAPTER;

  return (
    <div ref={rootRef} className={'chamber-product cp-story ' + (paused ? 'cp-paused ' : '') + (ready ? 'cp-ready' : '')} data-chamber-product data-chapter={chapter} data-listening={listening} data-context-surface-origin="other" tabIndex={-1}>
      <a className="cp-skip" href="#chamber-listening" onClick={() => setEntered(true)}>Aller directement aux morceaux</a>
      <div className="cp-material-stage" aria-hidden="true">
        <div className="cp-room-light" /><div className="cp-floor" />
        <ChamberMaterial progress={progress} paused={paused} playing={audioState.isPlaying} pulse={pulse} className="cp-material" />
        <div className="cp-material-shade" /><div className="cs-stage-grain" />
      </div>
      <header className="cp-header">
        <button type="button" className="cp-wordmark" onClick={() => goToChapter(0)} aria-label="Synaura, revenir à l’entrée">SYNAURA</button>
        <nav className="cp-top-nav" aria-label="Navigation Synaura">
          <button type="button" onClick={() => goToChapter(0)} aria-current={!listening ? 'page' : undefined}>L’expérience</button>
          <button type="button" onClick={() => goToChapter(LAST_CHAMBER_CHAPTER)} aria-current={listening ? 'page' : undefined}>Écouter</button>
          <Link href="/create">Créer <ArrowUpRight size={11} /></Link>
        </nav>
        <div className="cp-header-tools"><Link href="/search" aria-label="Rechercher dans Synaura"><Search size={17} /></Link><Link href="/library" className="cp-library-link">Bibliothèque <ArrowUpRight size={13} /></Link></div>
      </header>

      <section ref={node => { panelsRef.current[0] = node; }} id="chamber-ressentir" className="cp-entry cp-story-panel cs-opening" data-active={chapter === 0} aria-labelledby="cp-entry-title" tabIndex={-1}>
        <div className="cp-entry-copy">
          <p className="cp-eyebrow"><span /> LA CHAMBRE SONORE</p>
          <h1 id="cp-entry-title"><span>LE SON</span><span>PREND</span><span>CORPS<span className="cp-dot">.</span></span></h1>
          <p className="cp-entry-description">Il y a la musique que l’on écoute.<br />Et celle que l’on ressent.</p>
          <div className="cp-entry-action">{presentationHref ? <Link href={presentationHref} className="cp-button cp-button-light">Découvrir Synaura <ArrowUpRight size={20} /></Link> : <button type="button" className="cp-button cp-button-light" onClick={() => goToChapter(1)}>Découvrir Synaura <ArrowUpRight size={20} /></button>}<span>LA MUSIQUE. LES PERSONNES.<br /><b>ET TOUT CE QUI NOUS RELIE.</b></span></div>
        </div>
        <div className="cp-material-caption" aria-hidden="true"><span>+</span> MATIÈRE SONORE<br />COBALT / 001</div>
        <button type="button" className="cp-material-pulse" onClick={() => setPulse(value => value + 1)} disabled={paused} aria-label="Envoyer une onde dans la matière"><span className="cp-pulse-mark" aria-hidden="true">≋</span> TOUCHEZ LA MATIÈRE <ArrowUpRight size={15} /></button>
      </section>

      <section ref={node => { panelsRef.current[1] = node; }} id="chamber-synaura" className="cp-story-panel cs-definition" data-active={chapter === 1} aria-labelledby="cs-definition-title" tabIndex={-1}>
        <div className="cs-ambient-index" aria-hidden="true">S.</div>
        <div className="cs-definition-copy cs-reveal">
          <p className="cp-eyebrow"><span /> QU’EST-CE QUE SYNAURA ?</p>
          <h2 id="cs-definition-title">UN UNIVERS.<br /><span>VOS ÉMOTIONS.</span><br />VOTRE MUSIQUE.</h2>
          <p className="cs-description">Un espace musical et social pour écouter, créer et partager.<br className="cs-desktop-break" /> Et rencontrer les personnes de l’autre côté du son.</p>
          <div className="cs-definition-signature"><span>ÉCOUTER</span><i /><span>CRÉER</span><i /><span>SE RENCONTRER</span></div>
          <button type="button" className="cs-next-link" onClick={() => goToChapter(2)}>Suivre le son <ArrowRight size={19} /></button>
        </div>
        <span className="cs-margin-note" aria-hidden="true">UNE MÊME ÉNERGIE. PLUSIEURS FAÇONS DE LA VIVRE.</span>
      </section>

      <section ref={node => { panelsRef.current[2] = node; }} id="chamber-explorer" className="cp-story-panel cs-explore" data-active={chapter === 2} aria-labelledby="cs-explore-title" tabIndex={-1}>
        <div className="cs-orbit-caption" aria-hidden="true"><span>+</span> DE L’INCONNU<br />AU COUP DE CŒUR.</div>
        <div className="cs-explore-copy cs-reveal">
          <p className="cp-eyebrow"><span /> ÉCOUTER & EXPLORER</p>
          <h2 id="cs-explore-title">SUIVEZ<br />CE QUI VOUS<br /><em>TRAVERSE.</em></h2>
          <p className="cs-description">Un morceau vous arrête. Un artiste vous intrigue.<br />Explorez les découvertes, entrez dans Live et gardez vos coups de cœur dans votre bibliothèque.</p>
          <div className="cs-feature-lines"><span><b>01</b> Des morceaux à découvrir</span><span><b>02</b> Des artistes à suivre</span><span><b>03</b> Des playlists à retrouver</span></div>
          <button type="button" className="cs-next-link" onClick={() => goToChapter(3)}>Et si le prochain son était le vôtre ? <ArrowRight size={19} /></button>
        </div>
      </section>

      <section ref={node => { panelsRef.current[3] = node; }} id="chamber-creer" className="cp-story-panel cs-create" data-active={chapter === 3} aria-labelledby="cs-create-title" tabIndex={-1}>
        <div className="cs-creation-lines" aria-hidden="true"><i /><i /><i /><span>UNE IMPULSION.<br />VOTRE EMPREINTE.</span></div>
        <div className="cs-create-copy cs-reveal">
          <p className="cp-eyebrow"><span /> CRÉER & PARTAGER</p>
          <h2 id="cs-create-title">D’UNE IDÉE.<br />À VOTRE<br /><em>SIGNATURE.</em></h2>
          <p className="cs-description">Vos morceaux ont leur place ici.<br />Explorez le Studio, expérimentez avec les outils IA ou publiez la musique que vous avez déjà créée.</p>
          <div className="cs-creation-steps"><div><small>01 / LE TERRAIN DE JEU</small><b>Studio</b></div><div><small>02 / LES POSSIBILITÉS</small><b>Création IA</b></div><div><small>03 / VOTRE EMPREINTE</small><b>Publication</b></div></div>
          <button type="button" className="cs-next-link" onClick={() => goToChapter(4)}>Le son prend vie quand il se partage <ArrowRight size={19} /></button>
        </div>
      </section>

      <section ref={node => { panelsRef.current[4] = node; }} id="chamber-rencontrer" className="cp-story-panel cs-meet" data-active={chapter === 4} aria-labelledby="cs-meet-title" tabIndex={-1}>
        <div className="cs-connections" aria-hidden="true"><i /><i /><i /><span>VOUS</span><span>LES AUTRES</span></div>
        <div className="cs-meet-copy cs-reveal">
          <p className="cp-eyebrow"><span /> PLUS QU’UNE ÉCOUTE</p>
          <h2 id="cs-meet-title">LE SON NOUS<br /><em>RAPPROCHE.</em></h2>
          <p className="cs-description">Derrière chaque morceau, quelqu’un.<br />Échangez dans les commentaires, réagissez à un moment musical et retrouvez la communauté.</p>
          <div className="cs-meet-notes"><span>Des profils à découvrir</span><span>Des moments à partager</span><span>Des conversations à poursuivre</span></div>
          <button type="button" className="cp-button cp-button-light cs-listen-cta" onClick={() => goToChapter(LAST_CHAMBER_CHAPTER)}>Trouver ma fréquence <ArrowUpRight size={20} /></button>
          <span className="cs-meet-afterword">L’EXPLORATION DEVIENT LA VÔTRE.</span>
        </div>
      </section>

      <section ref={node => { panelsRef.current[5] = node; }} id="chamber-listening" className="cp-listening-section cp-story-panel" aria-label="Écouter la musique Synaura" tabIndex={-1}>
        <ChamberListening enabled={entered} paused={paused} onMotionToggle={toggleMotion} />
      </section>

      <nav className="cs-chapter-rail" aria-label="Chapitres de l’expérience" hidden={listening}>
        <div className="cs-chapter-count"><b>{String(chapter + 1).padStart(2, '0')}</b><span>/ 06</span><span className="cs-scroll-hint"><ArrowDown size={12} /> DÉFILER POUR EXPLORER</span></div>
        <div className="cs-chapter-stops">{CHAMBER_CHAPTERS.map((item, index) => <button key={item.id} type="button" aria-current={chapter === index ? 'step' : undefined} aria-label={'Chapitre ' + (index + 1) + ' : ' + item.label} onClick={() => goToChapter(index)}><i /><span>{item.label}</span></button>)}</div>
        <div className="cs-rail-controls"><button type="button" disabled={chapter === 0} aria-label="Chapitre précédent" onClick={() => goToChapter(chapter - 1)}><ArrowLeft size={17} /></button><button type="button" aria-label="Chapitre suivant" onClick={() => goToChapter(chapter + 1)}><ArrowRight size={17} /></button><button type="button" className="cs-motion" onClick={toggleMotion} aria-pressed={paused} aria-label={paused ? 'Reprendre les animations' : 'Mettre les animations en pause'}>{paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? 'En pause' : 'Mouvement'}</span></button></div>
      </nav>
      <p className="cs-announcement" role="status" aria-live="polite">Chapitre {chapter + 1} sur 6 : {CHAMBER_CHAPTERS[chapter].label}</p>
    </div>
  );
}
