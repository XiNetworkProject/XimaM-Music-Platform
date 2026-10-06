'use client';
import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SynauraOverlay, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';
import { useVoiceCalls } from './VoiceCallProvider';
type Entry={id:string;conversationId:string;title:string;group:boolean;direction:string;outcome:string;createdAt:string;durationSeconds:number|null;members:{id:string;name:string}[]};
const labels:Record<string,string>={ongoing:'En cours',completed:'Terminé',missed:'Manqué',cancelled:'Sans réponse',declined:'Refusé',failed:'Impossible'};
export function CallHistory({conversationId,compact=false}:{conversationId?:string;compact?:boolean}){
  const {data:session}=useSession();const voice=useVoiceCalls();
  const generation=useRef(0);
  const [open,setOpen]=useState(false),[items,setItems]=useState<Entry[]>([]),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>{if(new URLSearchParams(location.search).get('calls')==='1')setOpen(true);},[]);
  useEffect(()=>{
    const epoch=++generation.current;if(!open)return;const controller=new AbortController();setLoading(true);setError('');setItems([]);setCursor(null);
    const params=new URLSearchParams(conversationId?{conversationId}:{});
    void fetch('/api/messages/calls/history?'+params,{cache:'no-store',signal:controller.signal}).then(async response=>{
      if(!response.ok)throw Error('Impossible de charger les appels.');const data=await response.json();if(controller.signal.aborted||generation.current!==epoch)return;setItems(data.calls);setCursor(data.nextCursor);
    }).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>{generation.current++;controller.abort();};
  },[open,conversationId,session?.user?.id]);
  const more=async()=>{if(!cursor||loading)return;const epoch=generation.current;setLoading(true);setError('');try{
    const params=new URLSearchParams({before:cursor,...(conversationId?{conversationId}:{})});
    const response=await fetch('/api/messages/calls/history?'+params,{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();
    if(epoch!==generation.current)return;
    setItems(current=>Array.from(new Map([...current,...data.calls].map(item=>[item.id,item])).values()));setCursor(data.nextCursor);
  }catch{if(epoch===generation.current)setError('Chargement impossible. Réessaie.');}finally{if(epoch===generation.current)setLoading(false);}};
  return <><button type="button" aria-label="Historique des appels" onClick={()=>setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm text-syn-textSecondary hover:text-syn-textPrimary"><PhoneMissed size={17}/>{!compact&&'Appels'}</button>
    <SynauraOverlay open={open} onClose={()=>setOpen(false)} presentation="responsive" size="md">
      <SynauraOverlayTitle>Historique des appels</SynauraOverlayTitle>
      <p className="mt-1 text-sm text-syn-textSecondary">Entrants, sortants et manqués</p>
      <div className="mt-5 max-h-[65dvh] space-y-2 overflow-y-auto pb-6">
        {items.map(item=>{const missed=item.outcome==='missed',Icon=missed?PhoneMissed:item.direction==='outgoing'?PhoneOutgoing:PhoneIncoming;
          const name=item.group?item.title:item.members.find(person=>person.id!==session?.user?.id)?.name||item.title;
          return <article key={item.id} className="flex items-center gap-3 rounded-2xl bg-white/[.035] p-3">
            <Icon size={22} className={missed?'text-rose-300':'text-syn-textSecondary'}/><div className="min-w-0 flex-1"><Link href={'/messages/'+encodeURIComponent(item.conversationId)} className="block truncate font-medium" onClick={()=>setOpen(false)}>{name}</Link>
              <p className="text-sm text-syn-textSecondary">{item.direction==='outgoing'?'Sortant':'Entrant'} · {labels[item.outcome]||item.outcome}{item.durationSeconds!==null?` · ${Math.floor(item.durationSeconds/60)} min ${item.durationSeconds%60} s`:''}</p>
              <time className="text-xs text-syn-textSecondary" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time>
            </div><button type="button" disabled={!voice.enabled||voice.busy} aria-label={'Rappeler '+name} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40" onClick={()=>{setOpen(false);voice.start(item.conversationId);}}><Phone size={20}/></button>
          </article>;
        })}
        {!loading&&!error&&!items.length&&<p className="py-8 text-center text-syn-textSecondary">Aucun appel enregistré pour le moment.</p>}
        {error&&<p role="alert" className="text-rose-300">{error}</p>}
        {loading&&<p role="status" className="text-sm text-syn-textSecondary">Chargement…</p>}
        {cursor&&<button disabled={loading} onClick={()=>void more()} className="min-h-11 px-4">Voir les appels précédents</button>}
        {error&&!items.length&&<button onClick={()=>{setOpen(false);setTimeout(()=>setOpen(true),0);}} className="flex min-h-11 items-center gap-2"><RotateCw size={16}/>Réessayer</button>}
      </div>
    </SynauraOverlay></>;
}
