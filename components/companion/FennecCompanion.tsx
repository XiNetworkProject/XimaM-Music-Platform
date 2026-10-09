'use client';
import {Component,type ReactNode,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import {useSession} from 'next-auth/react';
import {PawPrint,MessageCircle,Grip,Heart,Sparkles,Moon,Settings2,ArrowUpRight,EyeOff} from 'lucide-react';
import {useHandoffRouter} from '@/hooks/useHandoffRouter';
import {getBrowserAudioCore,EMPTY_AUDIO_CORE_SNAPSHOT} from '@/lib/audio/AudioCore';
import {notificationStore} from '@/lib/ui/notifications';
import {useVoiceCalls} from '@/components/messaging/VoiceCallProvider';
import {SynauraOverlay,SynauraOverlayTitle} from '@/components/ui/SynauraOverlay';
import {DEFAULT_COMPANION,companionPreferences,companionBounds,companionRestingPlace,pageGuide,answerCompanion,companionSearchHits,allowHint,type CompanionPreferences,type CompanionAnswer,type CompanionAction,type SearchHit} from '@/synaura-app/src/companion/core';
import './fennec.css';

type Pet={ready:Promise<unknown>;state:string;setMusicPlaying:(v:boolean)=>void;setAuto:(v:boolean)=>void;setPaused:(v:boolean)=>void;setReducedMotion:(v:boolean)=>void;play:(s:string,options?:{user?:boolean})=>void;pet:()=>void;sleep:()=>void;destroy:()=>void};
declare global {interface Window {SynauraCompanion?:new(canvas:HTMLCanvasElement,options:Record<string,unknown>)=>Pet;}}
let engine:Promise<void>|null=null;
function loadEngine(){
  if(window.SynauraCompanion)return Promise.resolve();
  if(!engine)engine=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='/companions/fennec/engine.js';script.onload=()=>resolve();script.onerror=()=>{engine=null;script.remove();reject(Error('Compagnon indisponible'));};document.head.appendChild(script);});
  return engine;
}
class CompanionBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){console.warn('[companion] Presence unavailable; application unaffected.');}
  render(){return this.state.failed?null:this.props.children;}
}
export default function FennecCompanion(){const {data}=useSession();return <CompanionBoundary key={data?.user?.id||'guest'}><Fennec owner={data?.user?.id||'guest'}/></CompanionBoundary>;}
function Fennec({owner}:{owner:string}){
  const path=usePathname()||'/',router=useHandoffRouter(),calls=useVoiceCalls();
  const [prefs,setPrefs]=useState(DEFAULT_COMPANION),[loaded,setLoaded]=useState(false),[open,setOpen]=useState(false),[settings,setSettings]=useState(false);
  const [viewport,setViewport]=useState({width:390,height:844}),[systemReduced,setSystemReduced]=useState(false),[quiet,setQuiet]=useState(false),[online,setOnline]=useState(true);
  const [question,setQuestion]=useState(''),[answer,setAnswer]=useState<CompanionAnswer|null>(null),[hits,setHits]=useState<SearchHit[]>([]),[searching,setSearching]=useState(false),[confirm,setConfirm]=useState<CompanionAction|null>(null);
  const [hint,setHint]=useState(''),[unread,setUnread]=useState<number|undefined>(),[failure,setFailure]=useState(''),[ready,setReady]=useState(0),[wander,setWander]=useState(0);
  const [resting,setResting]=useState<{x:number;y:number}|null>(null);
  const canvas=useRef<HTMLCanvasElement>(null),pet=useRef<Pet|null>(null),drag=useRef<{x:number;y:number;px:number;py:number}|null>(null),abort=useRef<AbortController|null>(null),askGeneration=useRef(0);
  const gate=useRef({lastAt:Date.now()-180_000,seen:new Set<string>()}),recentToast=useRef(new Set<string>()),actionTime=useRef(0),queryInput=useRef<HTMLInputElement>(null);
  const confirmedTrack=useRef<string|undefined>(undefined);
  const presence=useRef<HTMLDivElement>(null),restorePetFocus=useRef(false);
  const core=typeof window==='undefined'?null:getBrowserAudioCore();
  const audio=useSyncExternalStore(core?.subscribe||(()=>()=>{}),core?.getSnapshot||(()=>EMPTY_AUDIO_CORE_SNAPSHOT),()=>EMPTY_AUDIO_CORE_SNAPSHOT);
  const calling=Boolean(calls.currentConversation||calls.busy||calls.incoming),reduced=prefs.reduced||systemReduced;
  const current=useRef({prefs,quiet,calling,open,audio,online,path,unread});current.current={prefs,quiet,calling,open,audio,online,path,unread};
  const key=`synaura.companion.v1.${owner}`,size=prefs.size==='small'?116:156,bounds=companionBounds(viewport.width,viewport.height,size);
  const x=Math.max(bounds.left,Math.min(bounds.right,(!prefs.positioned&&resting?resting.x:bounds.left+(bounds.right-bounds.left)*prefs.x)+wander)),y=Math.max(bounds.top,Math.min(bounds.bottom,!prefs.positioned&&resting?resting.y:bounds.top+(bounds.bottom-bounds.top)*prefs.y));
  const patch=(value:Partial<CompanionPreferences>)=>setPrefs(p=>companionPreferences({...p,...value}));
  function whisper(text:string,id:string){const s=current.current;if(allowHint(gate.current,id,Date.now(),s.prefs.hints,!s.online||s.quiet||s.calling||s.open||s.prefs.hidden))setHint(text);}
  useEffect(()=>{try{setPrefs(companionPreferences(JSON.parse(localStorage.getItem(key)||'null')));}catch{}setLoaded(true);return()=>{abort.current?.abort();askGeneration.current++;};},[key]);
  useEffect(()=>{if(loaded)try{localStorage.setItem(key,JSON.stringify(prefs));}catch{}},[loaded,key,prefs]);
  useEffect(()=>{
    if(prefs.positioned)return;setResting(null);
    const timer=setTimeout(()=>{
      const controls=Array.from(document.querySelectorAll('button,a,input,textarea,select,[role="button"]')).filter(el=>!el.closest('[data-fennec-root],[data-fennec-panel]')).map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0&&r.top<viewport.height&&r.bottom>0&&r.width*r.height<viewport.width*viewport.height*.32);
      setResting(companionRestingPlace(companionBounds(viewport.width,viewport.height,size),size,controls));
    },1200);return()=>clearTimeout(timer);
  },[path,viewport.width,viewport.height,size,prefs.positioned]);
  useEffect(()=>{
    const mq=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>setSystemReduced(mq.matches);
    const resized=()=>setViewport({width:window.innerWidth,height:window.visualViewport?.height||window.innerHeight}),network=()=>setOnline(navigator.onLine);motion();resized();network();
    mq.addEventListener('change',motion);window.addEventListener('resize',resized);window.visualViewport?.addEventListener('resize',resized);window.addEventListener('online',network);window.addEventListener('offline',network);
    const checkQuiet=()=>{const focus=document.activeElement;const typing=focus instanceof HTMLElement&&Boolean(focus.closest('input,textarea,[contenteditable="true"]'));setQuiet(document.hidden||typing||Boolean(document.querySelector('[data-fennec-host],[role="dialog"][aria-modal="true"],dialog[open]')));};
    let queued:number|null=null;const scheduleQuiet=()=>{if(queued===null)queued=requestAnimationFrame(()=>{queued=null;checkQuiet();});};
    const observer=new MutationObserver(scheduleQuiet);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-modal','open','data-fennec-host']});checkQuiet();
    document.addEventListener('focusin',checkQuiet);document.addEventListener('focusout',checkQuiet);document.addEventListener('visibilitychange',checkQuiet);
    const keyboard=(e:KeyboardEvent)=>{if(e.altKey&&e.shiftKey&&e.code==='KeyF'){e.preventDefault();setPrefs(p=>({...p,hidden:false}));setOpen(true);}};window.addEventListener('keydown',keyboard);
    return()=>{if(queued!==null)cancelAnimationFrame(queued);mq.removeEventListener('change',motion);window.removeEventListener('resize',resized);window.visualViewport?.removeEventListener('resize',resized);window.removeEventListener('online',network);window.removeEventListener('offline',network);observer.disconnect();document.removeEventListener('focusin',checkQuiet);document.removeEventListener('focusout',checkQuiet);document.removeEventListener('visibilitychange',checkQuiet);window.removeEventListener('keydown',keyboard);};
  },[]);
  useEffect(()=>{const showHelp=()=>{if(current.current.calling)return;setHint('');setOpen(true);setSettings(false);};window.addEventListener('synaura:companion-open',showHelp);return()=>window.removeEventListener('synaura:companion-open',showHelp);},[]);
  useEffect(()=>{
    if(!loaded||prefs.hidden||!canvas.current)return;let disposed=false,instance:Pet|null=null;const controller=new AbortController();
    Promise.all([loadEngine(),fetch('/companions/fennec/atlas.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();})]).then(async([,atlas])=>{
      if(disposed||!canvas.current||!window.SynauraCompanion)return;
      instance=new window.SynauraCompanion(canvas.current,{atlas,atlasURL:'/companions/fennec/atlas.webp',scene:'transparent',auto:current.current.prefs.autonomous,scale:1.25,pixelated:true});pet.current=instance;
      await instance.ready;if(disposed)return;instance.play('appear');setReady(n=>n+1);setFailure('');
    }).catch(()=>{if(!disposed)setFailure('Le fennec n’a pas pu être chargé. Son aide reste accessible.');});
    return()=>{disposed=true;controller.abort();instance?.destroy();pet.current=null;};
  },[loaded,prefs.hidden]);
  useEffect(()=>{pet.current?.setReducedMotion(reduced);pet.current?.setAuto(prefs.autonomous);pet.current?.setPaused(quiet||calling);},[ready,reduced,prefs.autonomous,quiet,calling]);
  useEffect(()=>{pet.current?.setMusicPlaying(audio.isPlaying&&!calling);},[ready,audio.isPlaying,calling]);
  useEffect(()=>{setConfirm(null);confirmedTrack.current=undefined;},[audio.currentTrack?._id]);
  useEffect(()=>{if(calling){setOpen(false);setHint('');setConfirm(null);pet.current?.play('sit');}},[calling]);
  useEffect(()=>{if(!open&&!quiet&&!calling&&restorePetFocus.current){restorePetFocus.current=false;presence.current?.querySelector('button')?.focus({preventScroll:true});}},[open,quiet,calling]);
  useEffect(()=>{setConfirm(null);const timer=setTimeout(()=>{pet.current?.play('curious');whisper(`Tu explores ${pageGuide(path).title} ? Je peux te guider.`,`page:${pageGuide(path).title}`);},8000);return()=>clearTimeout(timer);},[path]);
  useEffect(()=>{if(!hint)return;const timer=setTimeout(()=>setHint(''),6500);return()=>clearTimeout(timer);},[hint]);
  useEffect(()=>notificationStore.subscribe(items=>{for(const item of items){if(recentToast.current.has(item.id))continue;recentToast.current.add(item.id);if(!current.current.calling&&!current.current.quiet){pet.current?.play(item.type==='success'?'happy':'curious');if(item.type==='error')whisper('Une action a rencontré un problème. Besoin d’aide ?','action-error');}}if(recentToast.current.size>100)recentToast.current.clear();}),[]);
  useEffect(()=>{const listener=(e:Event)=>{const d=(e as CustomEvent).detail;if(d?.owner!==owner||!Number.isInteger(d.count)||d.count<0)return;setUnread(previous=>{if(previous!==undefined&&d.count>previous){pet.current?.play('look');whisper('Du nouveau dans tes notifications.','notifications');}return d.count;});};window.addEventListener('synaura:companion-notifications',listener);return()=>window.removeEventListener('synaura:companion-notifications',listener);},[owner]);
  useEffect(()=>{if(audio.error)whisper('Le lecteur signale un problème. Je peux te guider.','audio-error');},[audio.error]);
  useEffect(()=>{
    let stop:ReturnType<typeof setTimeout>|undefined;
    const timer=setInterval(()=>{const s=current.current;if(reduced||!s.prefs.autonomous||s.prefs.hidden||s.quiet||s.calling||s.open||s.audio.isPlaying||drag.current||pet.current?.state==='sleep')return;setWander(Math.random()>.5?-20:0);pet.current?.play('walk',{user:false});stop=setTimeout(()=>pet.current?.play('idle',{user:false}),2300);},24000);
    const react=(e:MouseEvent)=>{if(e.target instanceof Element&&e.target.closest('[data-fennec-root],[data-fennec-panel]'))return;if(Date.now()-actionTime.current<12000)return;actionTime.current=Date.now();const s=current.current;if(!s.quiet&&!s.calling&&!s.open)pet.current?.play('look');};document.addEventListener('click',react);
    return()=>{clearInterval(timer);clearTimeout(stop);document.removeEventListener('click',react);};
  },[reduced]);
  async function ask(text=question){
    const s=current.current;abort.current?.abort();const generation=++askGeneration.current;setHits([]);setConfirm(null);setSearching(false);
    const response=answerCompanion(text,{path:s.path,playing:s.audio.isPlaying,trackTitle:s.audio.currentTrack?.title,trackId:s.audio.currentTrack?._id,calling:s.calling,online:s.online,unread:s.unread});setAnswer(response);pet.current?.play('curious');
    if(!response.search)return;const controller=new AbortController();abort.current=controller;setSearching(true);const timeout=setTimeout(()=>controller.abort(),12000);
    try{const result=await fetch(`/api/search?q=${encodeURIComponent(response.search)}&limit=3`,{signal:controller.signal});if(!result.ok)throw Error();const data=await result.json();if(generation!==askGeneration.current)return;const found=companionSearchHits(data);setHits(found);setAnswer({...response,text:found.length?'Voici ce que le catalogue renvoie.':'Aucun résultat confirmé pour cette recherche.',search:undefined,actions:[{label:'Tous les résultats',href:`/search?q=${encodeURIComponent(response.search)}`}]});}
    catch{if(generation===askGeneration.current)setAnswer({text:'La recherche est indisponible pour le moment. Je n’ai aucun résultat confirmé.',source:'Recherche Synaura',actions:[]});}
    finally{clearTimeout(timeout);if(generation===askGeneration.current)setSearching(false);}
  }
  function close(restore=true){restorePetFocus.current=restore;setOpen(false);setConfirm(null);abort.current?.abort();askGeneration.current++;setSearching(false);}
  async function execute(action:CompanionAction,confirmed=false){
    if(action.confirm&&!confirmed){confirmedTrack.current=current.current.audio.currentTrack?._id;setConfirm(action);return;}
    if(action.href?.startsWith('/')&&!action.href.startsWith('//')){close(false);router.push(action.href);return;}
    if(action.audio&&confirmed&&!current.current.calling&&confirmedTrack.current===current.current.audio.currentTrack?._id){setConfirm(null);try{if(action.audio==='pause')core?.pause();else if(action.audio==='play')await core?.play();else core?.next();}catch{setAnswer({text:'Le lecteur n’a pas pu effectuer cette action.',source:'Lecteur Synaura',actions:[]});}}
  }
  function show(){setHint('');setSettings(false);setOpen(true);setAnswer(null);setHits([]);setQuestion('');}
  if(!loaded)return null;
  return <>
    <div ref={presence} className={`fennec-presence ${quiet||calling?'fennec-presence--quiet':''}`} data-fennec-root style={{left:x,top:y,width:size,height:size,transition:drag.current||reduced?'none':'left 2.3s linear, opacity .2s'}}>
      {prefs.hidden?<button className="fennec-restore" onClick={()=>patch({hidden:false})} aria-label="Faire revenir le compagnon"><PawPrint size={18}/></button>:<>
        <canvas ref={canvas} className="fennec-canvas" tabIndex={0} role="img" aria-label={`${prefs.name}, renard-fennec. Espace : caresser. J : sauter. D : dormir.`}/>
        {hint&&!quiet&&!calling&&<button className="fennec-whisper" style={x<viewport.width/2?{left:0,right:'auto'}:undefined} onClick={show}>{hint}</button>}
        <div className="fennec-tools"><button onClick={show} aria-label={`Parler à ${prefs.name}`}><MessageCircle size={16}/></button>
          <button aria-label="Déplacer le compagnon. Utilise les flèches au clavier." className="fennec-drag"
            onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,px:x,py:y};setWander(0);}}
            onPointerMove={e=>{const d=drag.current;if(d)patch({positioned:true,x:(d.px+e.clientX-d.x-bounds.left)/Math.max(1,bounds.right-bounds.left),y:(d.py+e.clientY-d.y-bounds.top)/Math.max(1,bounds.bottom-bounds.top)});}}
            onPointerUp={e=>{drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);pet.current?.play('happy');}} onPointerCancel={()=>{drag.current=null;}}
            onKeyDown={e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();patch({positioned:true,x:(x-bounds.left)/Math.max(1,bounds.right-bounds.left)+(e.key==='ArrowRight'? .08:e.key==='ArrowLeft'?-.08:0),y:(y-bounds.top)/Math.max(1,bounds.bottom-bounds.top)+(e.key==='ArrowDown'? .08:e.key==='ArrowUp'?-.08:0)});}}><Grip size={16}/></button>
          <button onClick={()=>patch({hidden:true})} aria-label="Masquer le compagnon"><EyeOff size={15}/></button></div>
      </>}
    </div>
    <SynauraOverlay open={open} onClose={()=>close()} presentation="responsive" size="sm" className="fennec-panel" initialFocusRef={queryInput}>
      <div data-fennec-panel><header className="fennec-heading"><span className="fennec-portrait"/><div><span className="fennec-eyebrow">UN PETIT COMPAGNON, VRAIMENT LÀ</span><SynauraOverlayTitle>{prefs.name}</SynauraOverlayTitle><p>{audio.isPlaying?'On écoute ensemble.':`À tes côtés dans ${pageGuide(path).title}.`}</p></div></header>
        {failure&&<p role="status">{failure}</p>}
        <div className="fennec-play"><button onClick={()=>{pet.current?.pet();close();}}><Heart size={17}/>Caresser</button><button onClick={()=>{pet.current?.play('play');close();}}><Sparkles size={17}/>Jouer</button><button onClick={()=>{pet.current?.sleep();close();}}><Moon size={17}/>Repos</button><button onClick={()=>setSettings(!settings)} aria-expanded={settings}><Settings2 size={17}/>Réglages</button></div>
        {settings?<div className="fennec-settings"><label>Son petit nom<input value={prefs.name} maxLength={24} onChange={e=>patch({name:e.target.value})}/></label><label>Taille<select value={prefs.size} onChange={e=>patch({size:e.target.value as CompanionPreferences['size']})}><option value="normal">Normale</option><option value="small">Discrète</option></select></label>
          {([['autonomous','Se promener et jouer'],['hints','Petits conseils spontanés'],['reduced','Moins de mouvements']] as const).map(([key,label])=><label key={key} className="fennec-toggle"><span>{label}</span><input type="checkbox" checked={prefs[key]} onChange={e=>patch({[key]:e.target.checked})}/></label>)}
          <button className="fennec-secondary" onClick={()=>patch({x:1,y:1,positioned:false})}>Replacer automatiquement</button><button className="fennec-secondary" onClick={()=>{patch({hidden:true});close();}}>Masquer — une petite patte permet de le rappeler</button><p className="fennec-privacy">Réglages sur cet appareil. Pas d’écoute du micro, pas de lecture des messages privés, pas d’historique de questions sauvegardé.</p>
        </div>:<><div className="fennec-suggestions"><button onClick={()=>void ask('aide')}>M’aider ici</button><button onClick={()=>void ask('guide moi')}>Pas à pas</button><button onClick={()=>void ask('Qu’est-ce qui joue ?')}>Ce qu’on écoute</button></div>
          <form onSubmit={e=>{e.preventDefault();void ask();}} className="fennec-question"><input ref={queryInput} aria-label="Ta question au compagnon" maxLength={400} placeholder="Une question, un son à retrouver…" value={question} onChange={e=>setQuestion(e.target.value)}/><button disabled={!question.trim()||searching} aria-label="Demander"><ArrowUpRight size={20}/></button></form>
          <div className="fennec-answer" aria-live="polite" aria-busy={searching}>{answer?<><p>{searching?'Je cherche dans Synaura…':answer.text}</p><small>{answer.source}</small>{hits.map(hit=><button key={hit.href} className="fennec-result" onClick={()=>void execute({label:hit.label,href:hit.href})}><span>{hit.label}<small>{hit.detail}</small></span><ArrowUpRight size={17}/></button>)}{answer.actions.map(action=><button className="fennec-action" key={action.label} onClick={()=>void execute(action)}>{action.label}<ArrowUpRight size={16}/></button>)}</>:<p>{pageGuide(path).text}</p>}</div>
          {confirm&&<div className="fennec-confirm" role="group" aria-label="Confirmer l’action"><p>{confirm.confirm}</p><button onClick={()=>void execute(confirm,true)}>Confirmer : {confirm.label}</button><button onClick={()=>setConfirm(null)}>Annuler</button></div>}
          <p className="fennec-privacy">Une aide Synaura, pas une réponse inventée. Aucune publication, dépense ou modification de compte automatique.</p>
        </>}
      </div>
    </SynauraOverlay>
  </>;
}
