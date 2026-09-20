'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Radio, Sparkles } from 'lucide-react';
import { MotionControl } from '@/components/ambient/LivingAmbience';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { ProductScreen } from './ProductScreens';
import './entry-experience.css';
import './presentation-slides.css';

const CHAPTERS = ['Bienvenue', 'Découvrir', 'Créer', 'Se rencontrer'];

/** Optional horizontal introduction. No autoplay, account mutation, or audio access. */
export default function SynauraPresentation({ callbackUrl = '/live' }: { callbackUrl?: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const slides = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState(0);
  const { enabled } = useLivingMotion();
  const signupHref = `/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setActive(Math.max(0, Math.min(CHAPTERS.length - 1, Math.round(element.scrollLeft / Math.max(1, element.clientWidth)))));
      });
    };
    element.addEventListener('scroll', measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    return () => { element.removeEventListener('scroll', measure); resize.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => { slides.current.forEach((slide, index) => { if (slide) slide.inert = index !== active; }); }, [active]);

  const go = (index: number) => {
    const target = Math.max(0, Math.min(CHAPTERS.length - 1, index));
    if (document.activeElement?.closest('.sp-slide')) rail.current?.focus({ preventScroll: true });
    rail.current?.scrollTo({ left: target * rail.current.clientWidth, behavior: enabled ? 'smooth' : 'instant' });
  };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element) || event.target.closest('a,button,input,textarea,select,[role="dialog"]')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      go(active + (event.key === 'ArrowRight' ? 1 : -1));
    }
  };

  return <div className="entry-experience syn-presentation" data-moving={enabled} onKeyDown={keyboard}>
    <header className="sp-header"><Link href="/landing" className="sp-home" aria-label="Revenir à l’accueil Synaura"><ArrowLeft size={16} /><img src="/brand/v2/synaura-lockup.svg" width="145" height="35" alt="Synaura" /></Link><span>DÉCOUVRIR SYNAURA</span><Link href={signupHref} className="sp-skip">Passer la présentation <ArrowUpRight size={15} /></Link></header>
    <div ref={rail} className="sp-rail" role="region" aria-roledescription="carrousel" aria-label="Présentation de Synaura" tabIndex={0}>
      <section ref={node => { slides.current[0] = node; }} className="sp-slide" role="group" aria-roledescription="diapositive" aria-label="1 sur 4 : Bienvenue" data-active={active === 0}>
        <div className="sp-slide-inner"><div className="sp-copy"><p className="entry-kicker">01 / BIENVENUE DANS SYNAURA</p><h1>La musique.<br /><em>Et tout ce<br />qu’elle nous fait.</em></h1><p>Un lieu pour écouter, créer et se rencontrer.<br />Vos prochains coups de cœur commencent ici.</p><div className="sp-pills"><span><Radio size={14} />Écouter</span><span><Sparkles size={14} />Créer</span><span><Heart size={14} />Partager</span></div><button type="button" className="entry-primary" onClick={() => go(1)}>Montrez-moi <ArrowRight size={18} /></button></div><div className="sp-visual"><ProductScreen screen="live" /><p className="sp-visual-note">Le Live. Un morceau, toute votre attention.</p></div></div>
      </section>
      <section ref={node => { slides.current[1] = node; }} className="sp-slide" role="group" aria-roledescription="diapositive" aria-label="2 sur 4 : Découvrir" data-active={active === 1}>
        <div className="sp-slide-inner"><div className="sp-copy"><p className="entry-kicker">02 / ÉCOUTER & EXPLORER</p><h2>Suivez votre<br /><em>fréquence.</em></h2><p>Des artistes à découvrir, des morceaux à garder.<br />Parcourez le Live et retrouvez vos coups de cœur<br className="sp-wide-break" /> dans vos favoris et vos playlists.</p><ul className="sp-features"><li>Une écoute à la fois, sans perdre le fil.</li><li>Des réactions au passage qui vous touche.</li><li>Votre bibliothèque, à votre image.</li></ul></div><div className="sp-visual"><ProductScreen screen="discover" /><p className="sp-visual-note">De l’inconnu au coup de cœur.</p></div></div>
      </section>
      <section ref={node => { slides.current[2] = node; }} className="sp-slide" role="group" aria-roledescription="diapositive" aria-label="3 sur 4 : Créer" data-active={active === 2}>
        <div className="sp-slide-inner"><div className="sp-copy"><p className="entry-kicker">03 / VOTRE TOUR DE CRÉER</p><h2>Une idée.<br /><em>Votre signature.</em></h2><p>Quelques mots, vos paroles ou un audio.<br />Donnez forme à votre musique dans le Studio,<br className="sp-wide-break" /> puis partagez-la quand vous êtes prêt.</p><div className="sp-pills"><span><Sparkles size={14} />Studio IA</span><span>Vos morceaux</span></div><small>V6 Mini accessible sans abonnement.<br />La génération utilise des crédits.</small></div><div className="sp-visual"><ProductScreen screen="studio" /><p className="sp-visual-note">La création et votre collection, au même endroit.</p></div></div>
      </section>
      <section ref={node => { slides.current[3] = node; }} className="sp-slide sp-join" role="group" aria-roledescription="diapositive" aria-label="4 sur 4 : Se rencontrer" data-active={active === 3}>
        <div className="sp-slide-inner"><div className="sp-copy"><p className="entry-kicker">04 / LE SON NOUS RAPPROCHE</p><h2>Vos goûts.<br /><em>Leurs univers.</em></h2><p>Derrière chaque morceau, quelqu’un.<br />Suivez des artistes, échangez et partagez vos créations.</p><Link href={signupHref} className="entry-primary">Créer mon compte <ArrowUpRight size={19} /></Link><small>Gratuit pour commencer. À votre rythme.</small><Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="entry-text-link">J’ai déjà un compte <ArrowRight size={15} /></Link></div><div className="entry-social-orbit sp-orbit" aria-hidden="true"><i /><i /><i /><span><Heart size={32} /></span><b>+</b><b>♪</b><b>↗</b></div></div>
      </section>
    </div>
    <footer className="sp-controls"><MotionControl /><nav aria-label="Diapositives de présentation">{CHAPTERS.map((label, index) => <button key={label} type="button" onClick={() => go(index)} aria-current={active === index ? 'step' : undefined} aria-label={`Diapositive ${index + 1} : ${label}`}><i /><span>{label}</span></button>)}</nav><div className="sp-arrows"><span className="sp-count" aria-live="polite" aria-atomic="true">{String(active + 1).padStart(2, '0')} / 04</span><button type="button" aria-label="Diapositive précédente" disabled={active === 0} onClick={() => go(active - 1)}><ArrowLeft size={19} /></button><button type="button" aria-label="Diapositive suivante" disabled={active === CHAPTERS.length - 1} onClick={() => go(active + 1)}><ArrowRight size={19} /></button></div></footer>
  </div>;
}
