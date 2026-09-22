import PilotImage from './PilotImage';
import type { CSSProperties } from 'react';
import { liveParticlePaths } from '@/lib/liveAmbience';

/** The actual cover supplies every hue, without a canvas read or a guessed palette. */
export default function LiveAtmosphere({ cover,particles }: { cover:string|null;particles:number }) {
  return <div className="live-atmosphere" aria-hidden="true">
    {cover && <div className="live-cover-world"><PilotImage src={cover} alt=""/></div>}
    <div className="live-cover-shade"/>
    {cover && <><div className="live-cover-aura"><PilotImage src={cover} alt=""/></div>
      <div className="live-music-particles" key={cover}>{liveParticlePaths(cover,particles).map((p,i)=><i key={i} style={{left:`${5+p.x*1.1}%`,'--speck-delay':`${-i*2.3}s`,'--speck-drift':`${p.dx}px`,'--speck-size':`${p.size}px`} as CSSProperties}><span><PilotImage src={cover} alt="" style={{objectPosition:`${p.crop}% 50%`}}/></span></i>)}</div></>}
  </div>;
}
