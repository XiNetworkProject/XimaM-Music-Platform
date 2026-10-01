'use client';
import { useState } from 'react';
import ProductHintCard from '@/components/benefits/ProductHintCard';
import { hintsFor, type HintFacts, type HintPlacement } from '@/lib/productHints';

const free: HintFacts = { plan:'free', owned:2, creation:0, dailyReady:false, earlierWithMembership:true, packs:0 };
const cases: { label:string; placement:HintPlacement; facts:HintFacts; id:string; compact?:boolean }[] = [
  { label:'Dans le fil · invitation compacte, aucun morceau remplacé',placement:'live',facts:free,id:'boost-owned',compact:true },
  { label:'Découvrir · ta réserve réelle',placement:'discover',facts:free,id:'boost-owned' },
  { label:'Studio · une autre possibilité pour ton idée',placement:'studio',facts:free,id:'studio-models' },
  { label:'Messagerie · signé Synaura, jamais un faux ami',placement:'messages',facts:{...free,owned:0,earlierWithMembership:false},id:'membership-discovery' },
  { label:'Notifications · un avantage déjà inclus',placement:'notifications',facts:{...free,plan:'starter',packs:1},id:'included-pack' },
  { label:'Le clin d’œil · seulement si le délai le confirme',placement:'notifications',facts:{...free,owned:0},id:'earlier-daily' },
  { label:'Publication · décider quand donner un coup de pouce',placement:'publish',facts:free,id:'boost-owned' },
];
export default function BenefitsPreview() {
  const [hidden,setHidden]=useState<string[]>([]);
  return <main style={{maxWidth:900,margin:'0 auto',padding:'40px 20px 120px',color:'#edf0f8'}}><p style={{fontSize:11,color:'#baa6e7',letterSpacing:2}}>SYNAURA / LES PETITS PLUS</p><h1 style={{fontSize:36,margin:'12px 0'}}>La bonne occasion.<br/>Pas une interruption.</h1><p style={{fontSize:13,color:'#aeb7cb',lineHeight:1.7}}>Aperçu local avec données simulées, sans attribution de récompense ni envoi de message. En situation réelle : deux rappels maximum par 24 h sur cet appareil, espacés de 30 minutes.</p>
    <button onClick={()=>setHidden([])} style={{fontSize:12,padding:'12px 0',color:'#c4b5fd'}}>Réafficher les exemples masqués</button>
    {cases.map(item=><section key={item.id+item.placement} style={{marginTop:28}}><h2 style={{fontSize:12,color:'#b5bed2',marginBottom:12}}>{item.label}</h2>{!hidden.includes(item.id+item.placement)&&<ProductHintCard hint={hintsFor(item.facts,item.placement).find(h=>h.id===item.id)!} placement={item.placement} compact={item.compact} onDismiss={()=>setHidden(v=>[...v,item.id+item.placement])} onQuiet={()=>setHidden(cases.map(c=>c.id+c.placement))} />}</section>)}
  </main>;
}
