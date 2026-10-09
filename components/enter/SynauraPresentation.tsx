'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Headphones, Sparkles } from 'lucide-react';
import { MotionControl } from '@/components/ambient/LivingAmbience';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { CelestialBackdrop, CelestialBrand, CelestialWorld } from '@/components/celestial/CelestialWorld';
import FennecGuide from '@/components/celestial/FennecGuide';
import FennecSprite from '@/components/celestial/FennecSprite';
import { ProductScreen } from './ProductScreens';
import './entry-experience.css';
import './presentation-slides.css';
import '@/components/celestial/celestial-story.css';

const CHAPTERS = ['Un endroit à toi', 'Écouter', 'Créer', 'Se rencontrer'];
const GUIDES = [
  'Moi, c’est ton petit compagnon. Viens, je te montre ce qu’on peut faire ici.',
  'Un swipe, une nouvelle rencontre musicale. Un cœur pour la garder tout près.',
  'Tu as un air en tête ? Le Studio aide à transformer tes mots en musique.',
  'Derrière chaque son, il y a quelqu’un. Et maintenant, il y a toi.',
];

/** Optional, user-controlled tour. No account or audio side effects. */
export default function SynauraPresentation({ callbackUrl = '/live', initialChapter = 0 }: { callbackUrl?: string; initialChapter?: number }) {
  const start = Number.isFinite(initialChapter) ? Math.max(0, Math.min(3, Math.trunc(initialChapter))) : 0;
  const rail = useRef<HTMLDivElement>(null);
  const slides = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState(start);
  const activeRef = useRef(start);
  activeRef.current = active;
  const { enabled } = useLivingMotion();
  const signupHref = `/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    element.scrollLeft = start * element.clientWidth;
    let frame = 0;
    const measure = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {frame = 0;setActive(Math.max(0,Math.min(3,Math.round(element.scrollLeft / Math.max(1,element.clientWidth)))));});
    };
    element.addEventListener('scroll', measure, {passive:true});
    const resize = new ResizeObserver(() => {element.scrollLeft = activeRef.current * element.clientWidth;});
    resize.observe(element);
    return () => {element.removeEventListener('scroll',measure);resize.disconnect();cancelAnimationFrame(frame);};
  }, [start]);
  useEffect(() => { slides.current.forEach((slide, index) => { if (slide) slide.inert = index !== active; }); }, [active]);
  const go = (index: number) => {
    const target = Math.max(0, Math.min(3, index));
    if (document.activeElement?.closest('.sp-slide')) rail.current?.focus({preventScroll:true});
    rail.current?.scrollTo({left:target*rail.current.clientWidth,behavior: enabled ? 'smooth' : 'instant'});
  };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element) || event.target.closest('a,button,input,textarea,select,[role="dialog"]')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {event.preventDefault();go(active + (event.key === 'ArrowRight' ? 1 : -1));}
  };
  return <CelestialWorld className="celestial-story"><CelestialBackdrop/>
    <header className="celestial-header"><CelestialBrand/><Link href={signupHref} className="celestial-text-button">Passer la présentation <ArrowUpRight size={15}/></Link></header>
    <div className="celestial-story-body" onKeyDown={keyboard}>
      <div ref={rail} className="sp-rail celestial-story-rail" role="region" aria-roledescription="carrousel" aria-label="Présentation de Synaura" tabIndex={0}>
        {CHAPTERS.map((chapter,index)=><section key={chapter} ref={node=>{slides.current[index]=node;}} className="sp-slide celestial-story-slide" role="group" aria-roledescription="diapositive" aria-label={`${index+1} sur 4 : ${chapter}`} aria-hidden={active!==index} data-active={active===index}>
          <div className="celestial-story-copy"><p className="celestial-eyebrow">0{index+1} / {chapter.toUpperCase()}</p>
            {index===0?<><h1>Plus qu’une écoute.<br/><em>Un petit monde.</em></h1><p>Écouter, créer, partager.<br/>Synaura réunit tout ce qui fait vivre ta musique.</p><div className="celestial-story-pills"><span><Headphones size={14}/>Écouter</span><span><Sparkles size={14}/>Créer</span><span><Heart size={14}/>Se rencontrer</span></div></>:null}
            {index===1?<><h2>Le prochain son.<br/><em>Le premier frisson.</em></h2><p>Un fil qui mêle morceaux, clips et publications.<br/>Explore les artistes, garde tes favoris et compose tes playlists.</p><ul><li>Live : une découverte à la fois.</li><li>Des commentaires au moment qui te touche.</li><li>Ta bibliothèque, à ton rythme.</li></ul></>:null}
            {index===2?<><h2>Une petite idée.<br/><em>Et ça prend vie.</em></h2><p>Écris tes paroles, décris une ambiance ou publie un morceau. Ton espace de création t’attend.</p><ul><li>Studio IA : des mots à la musique.</li><li>Tes morceaux et tes clips, réunis.</li><li>Tu choisis ce que tu partages.</li></ul><small>V6 Mini accessible sans abonnement. La génération utilise des crédits.</small></>:null}
            {index===3?<><h2>De beaux sons.<br/><em>De vraies personnes.</em></h2><p>Suis des artistes, partage tes découvertes, échange en messages ou retrouve tes amis en appel.</p><small>Un compte gratuit pour commencer. Aucune carte demandée à l’inscription.</small></>:null}
            <FennecGuide compact active={active===index} pose={index===1?'music':index===2?'curious':'tail'} text={GUIDES[index]}/>
          </div>
          <div className="celestial-story-visual">
            {index===0?<div className="celestial-story-nest"><div className="celestial-star-map" aria-hidden="true"><i/><i/><i/><span>✧</span></div><FennecSprite pose="tail" active={active===index}/><p>Petites oreilles.<br/><em>Grandes découvertes.</em></p></div>:null}
            {index===1?<ProductScreen screen="live"/>:null}
            {index===2?<ProductScreen screen="studio"/>:null}
            {index===3?<div className="celestial-story-nest celestial-story-invitation"><FennecSprite pose="happy" active={active===index}/><p>On y va <em>ensemble ?</em></p><Link href={signupHref} className="celestial-primary">Créer mon compte <ArrowUpRight size={18}/></Link><Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="celestial-text-button">J’ai déjà un compte <ArrowRight size={14}/></Link></div>:null}
          </div>
        </section>)}
      </div>
    </div>
    <footer className="celestial-story-controls"><MotionControl/><nav aria-label="Diapositives de présentation">{CHAPTERS.map((chapter,index)=><button key={chapter} onClick={()=>go(index)} aria-current={index===active?'step':undefined} aria-label={`Diapositive ${index+1} : ${chapter}`}><i/><span>{chapter}</span></button>)}</nav><div className="celestial-story-next"><button onClick={()=>go(active-1)} disabled={active===0} aria-label="Diapositive précédente"><ArrowLeft size={18}/></button><span aria-live="polite">0{active+1} / 04</span>{active<3?<button className="celestial-primary" onClick={()=>go(active+1)} aria-label="Diapositive suivante">Continuer <ArrowRight size={16}/></button>:<Link className="celestial-primary" href={signupHref}>C’est parti <ArrowUpRight size={16}/></Link>}</div></footer>
  </CelestialWorld>;
}
