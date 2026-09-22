'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { getBrowserAudioCore } from '@/lib/audio/AudioCore';
import { LiveAudioAnalyser, type LiveAnalysisStatus } from '@/lib/audio/LiveAudioAnalyser';

export function useLiveAudioPulse(root:RefObject<HTMLDivElement>,trackId:string|null,enabled:boolean,amount:number,sensitivity:number,particles:number) {
  const [status,setStatus]=useState<LiveAnalysisStatus>('idle');
  const current=useRef({trackId,enabled,amount,sensitivity,particles});current.current={trackId,enabled,amount,sensitivity,particles};
  const sync=useRef<()=>void>(()=>{});
  useEffect(()=>{
    const node=root.current,core=getBrowserAudioCore();if(!node||!core)return;
    const analyser=new LiveAudioAnalyser(signal=>{
      const settings=current.current;
      const energy=Math.min(1,signal.energy*(.5+settings.sensitivity/50));
      node.style.setProperty('--live-energy',(energy*settings.amount/100).toFixed(3));
      node.style.setProperty('--live-signal',energy.toFixed(3));
    },setStatus);
    sync.current=()=>{
      const state=core.getSnapshot(),settings=current.current;
      const playing=Boolean(settings.enabled&&settings.trackId&&state.currentTrack?._id===settings.trackId&&state.playbackState==='playing'&&!state.isMuted&&state.volume>0);
      node.dataset.musicPlaying=String(playing);
      analyser.setMedia(core.getAudioElement());
      analyser.setActive(playing&&(settings.amount>0||settings.particles>0));
    };
    const activate=()=>{if(current.current.enabled&&(current.current.amount>0||current.current.particles>0))analyser.activate();};
    sync.current();
    // A prior play gesture also unlocks a newly mounted Live view in supporting browsers.
    if(navigator.userActivation?.hasBeenActive)activate();
    node.addEventListener('pointerdown',activate,{capture:true,passive:true});node.addEventListener('keydown',activate,true);
    const off=core.subscribe(sync.current);
    return()=>{off();node.removeEventListener('pointerdown',activate,true);node.removeEventListener('keydown',activate,true);analyser.dispose();sync.current=()=>{};node.style.setProperty('--live-energy','0');node.style.setProperty('--live-signal','0');node.dataset.musicPlaying='false';};
  },[root]);
  useEffect(()=>sync.current(),[trackId,enabled,amount,sensitivity,particles]);
  return status;
}
