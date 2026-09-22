'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { liveParticlePaths } from '@/lib/liveAmbience';
import PilotImage from './PilotImage';

/** Presentation follows the committed feed identity, never delays or intercepts the swipe. */
export default function LiveSwipeLight({id,cover,enabled,duration,count}:{id:string;cover:string|null;enabled:boolean;duration:number;count:number}) {
  const previous=useRef(id);
  const [flight,setFlight]=useState<{id:string;serial:number}|null>(null);
  const serial=useRef(0);
  useEffect(()=>{
    const changed=previous.current!==id;previous.current=id;
    setFlight(changed&&enabled&&duration>0?{id,serial:++serial.current}:null);
    if(!changed||!enabled||duration<=0)return;
    const timer=setTimeout(()=>setFlight(null),duration*2+60);
    return()=>clearTimeout(timer);
  },[id,enabled,duration]);
  if(!flight)return null;
  return <div key={flight.serial} className="live-swipe-light" aria-hidden="true" style={{'--flight-duration':`${duration}ms`} as CSSProperties}>
    <span className="live-swipe-veil"/>
    {cover&&<span className="live-swipe-bloom"><PilotImage src={cover} alt=""/></span>}
    {cover&&liveParticlePaths(`${flight.id}:${flight.serial}`,count).map((particle,index)=><i key={index} style={{left:`${particle.x}%`,top:`${particle.y}%`,width:particle.size,height:particle.size,'--flight-x':`${particle.dx}px`,'--flight-y':`${particle.dy}px`,'--flight-delay':`${particle.delay}ms`} as CSSProperties}><PilotImage src={cover} alt="" style={{objectPosition:`${particle.crop}% ${100-particle.crop}%`}}/></i>)}
  </div>;
}
