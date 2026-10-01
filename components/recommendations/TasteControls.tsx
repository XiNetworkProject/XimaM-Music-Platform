'use client';
import { useEffect, useRef, useState } from 'react';

export function TasteControls({trackId,artistId,viewer}:{trackId:string;artistId:string;viewer:string}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const lock=useRef(false), alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const act=async(action:string)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
    try {const response=await fetch('/api/recommendations/taste',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,trackId,artistId,source:'context-options'})});
      if(!response.ok)throw new Error(response.status===401?'Reconnecte-toi pour enregistrer ce choix.':'Choix non enregistré. Réessaie.');
      if(alive.current){setMessage(action==='hide_artist'?'Artiste masqué pour les prochaines recommandations. Réversible dans Paramètres → Préférences.':'Préférence enregistrée pour les prochaines recommandations.');window.dispatchEvent(new Event('synaura:taste-updated'));}
    }catch(e){if(alive.current)setMessage((e as Error).message);}finally{lock.current=false;if(alive.current)setBusy(false);}
  };
  if(viewer==='public')return null;
  return <details className="px-3 py-3 text-sm"><summary className="min-h-11 cursor-pointer">Ajuster mes recommandations</summary><p className="text-xs text-[var(--syn-text-secondary)] mb-2">Tes choix orientent les prochaines sélections, sans changer la lecture ou ta file.</p><div className="flex flex-wrap gap-2">{[['more','Plus comme ça'],['less','Moins comme ça'],['hide_artist','Masquer cet artiste']].map(([id,label])=><button type="button" key={id} className="v2-context-action min-h-11 px-3" disabled={busy||(id==='hide_artist'&&!artistId)} onClick={()=>void act(id)}>{label}</button>)}</div><p role="status">{message}</p></details>;
}

export function HiddenArtists({owner}:{owner:string}) {
  const [artists,setArtists]=useState<Array<{id:string;name:string;username:string|null}>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[revision,setRevision]=useState(0);
  const lock=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;const controller=new AbortController();setArtists(null);setError('');
    if(!owner)return()=>{alive.current=false;};
    fetch('/api/recommendations/taste',{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();const data=await r.json();if(!controller.signal.aborted)setArtists(data.artists||[]);}).catch(()=>{if(!controller.signal.aborted)setError('Impossible de charger tes artistes masqués.');});
    return()=>{alive.current=false;controller.abort();};
  },[owner,revision]);
  const restore=async(id:string)=>{if(lock.current)return;lock.current=true;setBusy(id);setError('');try{const r=await fetch('/api/recommendations/taste',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'show_artist',artistId:id})});if(!r.ok)throw new Error();if(alive.current){setArtists(a=>a?.filter(p=>p.id!==id)||[]);window.dispatchEvent(new Event('synaura:taste-updated'));}}catch{if(alive.current)setError('Artiste non réaffiché. Réessaie.');}finally{lock.current=false;if(alive.current)setBusy('');}};
  return <section className="mt-4 space-y-3" aria-label="Artistes masqués"><h3 className="font-semibold">Tes recommandations</h3><p className="text-xs">Goûts personnels, nouveautés et artistes peu exposés. Les masquages concernent les recommandations, pas une recherche explicite ni un blocage social.</p>{error?<div role="alert">{error} <button type="button" className="underline min-h-10" onClick={()=>setRevision(v=>v+1)}>Réessayer</button></div>:artists===null?<p role="status">Chargement…</p>:artists.length?artists.map(a=><div key={a.id} className="flex flex-wrap justify-between gap-2"><span>{a.name}{a.username&&` · @${a.username}`}</span><button type="button" className="underline min-h-10" disabled={Boolean(busy)} onClick={()=>void restore(a.id)} aria-label={`Réafficher ${a.name}`}>{busy===a.id?'Enregistrement…':'Réafficher'}</button></div>):<p>Aucun artiste masqué.</p>}</section>;
}
