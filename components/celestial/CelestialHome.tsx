'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Headphones, Sparkles, Heart, Moon } from 'lucide-react';
import { MotionControl } from '@/components/ambient/LivingAmbience';
import { CelestialBackdrop, CelestialBrand, CelestialWorld } from './CelestialWorld';
import FennecGuide from './FennecGuide';
import FennecSprite from './FennecSprite';

export default function CelestialHome() {
  const [found, setFound] = useState(false);
  return <CelestialWorld className="celestial-home">
    <CelestialBackdrop/>
    <header className="celestial-header"><CelestialBrand/><nav aria-label="Découvrir Synaura"><Link href="/landing/presentation">L’univers Synaura</Link><Link href="/auth/signin" className="celestial-nav-login">Se connecter <ArrowUpRight size={15}/></Link></nav></header>
    <main className="celestial-home-main">
      <div className="celestial-home-copy"><p className="celestial-eyebrow"><span/> ÉCOUTER · CRÉER · SE RENCONTRER</p><h1>Un monde de sons.<br/><em>Un endroit<br/>{' '}à toi.</em><span className="celestial-title-spark" aria-hidden="true">✧</span></h1><p className="celestial-home-description">Des musiques qui te trouvent.<br/>Des idées qui prennent vie. Des gens qui restent.</p><div className="celestial-home-actions"><Link href="/enter" className="celestial-primary">Entrer dans Synaura <ArrowUpRight size={18}/></Link><Link href="/landing/presentation" className="celestial-text-button">Laisse-moi te guider <ArrowRight size={17}/></Link></div><span className="celestial-home-footnote">Gratuit pour commencer. Curieux pour toujours.</span></div>
      <div className="celestial-home-friend"><span className="celestial-orbit-caption"><Moon size={12}/> UN PETIT COMPAGNON. UN GRAND UNIVERS.</span><FennecGuide text="Psst… bienvenue chez toi. Je te fais visiter ?"/><span className="celestial-friend-ground" aria-hidden="true"/></div>
    </main>
    <footer className="celestial-home-footer"><div className="celestial-doorways">{[{Icon:Headphones,title:'Trouver son prochain son',chapter:1},{Icon:Sparkles,title:'Donner vie à une idée',chapter:2},{Icon:Heart,title:'Se sentir à sa place',chapter:3}].map(({Icon,title,chapter})=><Link key={chapter} href={`/landing/presentation?chapter=${chapter}`}><Icon size={16}/><span>{title}</span><ArrowUpRight size={14}/></Link>)}</div><div className="celestial-footer-bottom"><span>Un cœur dans les pixels.</span><button className="celestial-hidden-friend" onClick={()=>setFound(value=>!value)} aria-label="Découvrir le petit visiteur caché"><FennecSprite pose={found?'happy':'curious'}/><span aria-live="polite">{found?'Tu m’as trouvé. ♡':'La magie se cache dans les détails.'}</span></button><MotionControl/></div></footer>
  </CelestialWorld>;
}
