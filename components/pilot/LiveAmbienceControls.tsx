'use client';
import { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { SynauraPopover } from '@/components/ui/SynauraPopover';
import { DEFAULT_LIVE_AMBIENCE, LIVE_AMBIENCE_KEY, normalizeLiveAmbience, type LiveAmbience } from '@/lib/liveAmbience';
import type { LiveAnalysisStatus } from '@/lib/audio/LiveAudioAnalyser';

export function useLiveAmbienceSettings() {
  const [settings,setSettings]=useState(DEFAULT_LIVE_AMBIENCE);
  useEffect(()=>{
    const read=()=>{try{setSettings(normalizeLiveAmbience(JSON.parse(localStorage.getItem(LIVE_AMBIENCE_KEY)||'null')));}catch{setSettings(DEFAULT_LIVE_AMBIENCE);}};
    read();const sync=(event:StorageEvent)=>{if(event.key===LIVE_AMBIENCE_KEY)read();};
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
  },[]);
  const update=useCallback((next:LiveAmbience)=>{const value=normalizeLiveAmbience(next);setSettings(value);try{localStorage.setItem(LIVE_AMBIENCE_KEY,JSON.stringify(value));}catch{}},[]);
  return {settings,update};
}

export default function LiveAmbienceControls({ settings,update,enabled,setEnabled,constrained,status }: { settings:LiveAmbience;update:(next:LiveAmbience)=>void;enabled:boolean;setEnabled:(value:boolean)=>void;constrained:boolean;status:LiveAnalysisStatus }) {
  const [open,setOpen]=useState(false);
  const close=useCallback(()=>setOpen(false),[]);
  const range=(key:Exclude<keyof LiveAmbience,'parallax'>,label:string,min:number,max:number,unit='%')=><label className="live-ambience-range" key={key}><span>{label}<output>{settings[key]}{unit}</output></span><input type="range" min={min} max={max} step={key==='transition'?10:1} aria-label={label} value={settings[key]} onChange={event=>update({...settings,[key]:Number(event.target.value)})}/></label>;
  return <SynauraPopover open={open} onClose={close} label="Votre ambiance Live" className="live-ambience-panel" trigger={<button type="button" className="live-ambience-trigger" aria-label="Personnaliser l’ambiance Live" title="Ambiance" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><SlidersHorizontal size={18}/></button>}>
    <div className="live-ambience-title"><strong>Votre ambiance</strong><button type="button" aria-label="Fermer les réglages d’ambiance" onClick={close}><X size={17}/></button></div>
    <div className="live-ambience-presets">{[{name:'Doux',value:{...DEFAULT_LIVE_AMBIENCE,halo:40,pulse:35,particles:6,musicParticles:4,transition:350}},{name:'Immersif',value:DEFAULT_LIVE_AMBIENCE},{name:'Épuré',value:{...DEFAULT_LIVE_AMBIENCE,halo:20,pulse:0,particles:0,musicParticles:0,transition:0,parallax:false}}].map(preset=><button type="button" key={preset.name} onClick={()=>update(preset.value)}>{preset.name}</button>)}</div>
    <label className="live-ambience-toggle"><span>Animations</span><input type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/></label>
    <p className="live-analysis-status" role="status">{constrained?'Animations limitées par vos préférences système.':!enabled?'Animations désactivées.':status==='listening'?'● Analyse audio en direct':status==='unavailable'?'Analyse audio indisponible dans ce navigateur.':status==='waiting'?'Touchez Lecture ou ces réglages pour activer le pulse.':'Le pulse s’active pendant la lecture.'}</p>
    <fieldset><legend>Son en direct</legend>{range('pulse','Intensité du pulse',0,100)}{range('sensitivity','Sensibilité du son',0,100)}</fieldset>
    <fieldset><legend>Particules pendant la musique</legend>{range('musicParticles','Quantité',0,16,'')}{range('particleSpeed','Vitesse',0,100)}{range('particleSize','Taille',0,100)}{range('particleLight','Lumière des particules',0,100)}</fieldset>
    <details><summary>Fond & transition</summary>{range('halo','Lumière du halo',0,100)}{range('blur','Flou de la pochette',24,100,'px')}{range('darkness','Obscurité',35,85)}{range('transition','Fondu du swipe',0,650,'ms')}{range('particles','Particules du swipe',0,16,'')}<label className="live-ambience-toggle"><span>Suivre la souris</span><input type="checkbox" checked={settings.parallax} onChange={event=>update({...settings,parallax:event.target.checked})}/></label></details>
    <button type="button" className="live-ambience-reset" onClick={()=>update(DEFAULT_LIVE_AMBIENCE)}>Réinitialiser</button>
  </SynauraPopover>;
}
