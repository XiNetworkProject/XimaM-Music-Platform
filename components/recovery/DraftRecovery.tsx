'use client';
import { useEffect, useRef, useState } from 'react';
import { decodeDraft, draftKey, type TextDraft } from '@/lib/textDraft';

/** Text-only, account-scoped drafts. No file, credential or payment replay. */
export function DraftRecovery({owner,scope,fields,empty,apply,reset,completed=false}:{owner:string;scope:string;fields:Record<string,string>;empty:boolean;apply:(fields:Record<string,string>)=>void;reset:()=>void;completed?:boolean}) {
  const latest=useRef({fields,empty,apply,reset}); latest.current={fields,empty,apply,reset};
  const identity=owner?draftKey(owner,scope):'';
  const previousOwner=useRef(owner);
  const [ready,setReady]=useState(''),[saved,setSaved]=useState<TextDraft|null>(null),[message,setMessage]=useState('');
  const pending=useRef(false);
  const serialized=JSON.stringify(fields);
  useEffect(()=>{
    setSaved(null);setMessage('');setReady('');pending.current=false;
    if(previousOwner.current!==owner){latest.current.reset();previousOwner.current=owner;}
    if(!identity)return;
    try {
      const d=decodeDraft(sessionStorage.getItem(identity),Object.keys(latest.current.fields));
      if(d){setSaved(d);pending.current=true;}
      setReady(identity);
    } catch {setMessage('Sauvegarde locale indisponible. Garde cet onglet ouvert.');}
  },[identity,owner]);
  useEffect(()=>{
    if(!identity || ready!==identity || pending.current || completed)return;
    const save=()=>{
      try {
        if(latest.current.empty) {sessionStorage.removeItem(identity);setMessage('');return;}
        const value=JSON.stringify({version:1,savedAt:Date.now(),fields:latest.current.fields});
        if(value.length>60000)throw new Error('too large');
        sessionStorage.setItem(identity,value);setMessage('Brouillon texte sauvegardé dans cet onglet.');
      } catch {setMessage('Brouillon non sauvegardé. Garde cet onglet ouvert.');}
    };
    save();
  },[serialized,empty,ready,identity,completed,saved]);
  useEffect(()=>{if(completed&&identity){try{sessionStorage.removeItem(identity);}catch{} pending.current=false;setSaved(null);setMessage('');}},[completed,identity]);
  if(!owner)return null;
  return <div className="text-xs text-[var(--syn-text-secondary)] py-3" aria-label="Brouillon local">
    {saved&&ready===identity?<><p>Un brouillon texte est disponible dans cet onglet. Les fichiers et sons joints doivent être sélectionnés à nouveau.</p><div className="flex flex-wrap gap-4 mt-2"><button type="button" className="underline min-h-10" onClick={()=>{latest.current.apply(saved.fields);pending.current=false;setSaved(null);setMessage('Brouillon restauré.');}}>Restaurer le brouillon</button><button type="button" className="underline min-h-10" onClick={()=>{try{sessionStorage.removeItem(identity);pending.current=false;setSaved(null);setMessage('Ancien brouillon écarté.');}catch{setMessage('Impossible d’effacer le brouillon local.');}}}>Garder la saisie actuelle</button></div></>:<p role="status">{message}</p>}
  </div>;
}
