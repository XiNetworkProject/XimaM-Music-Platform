'use client';
import {useState} from 'react';
import {DraftRecovery} from '@/components/recovery/DraftRecovery';
export default function JourneyLab(){
 const [owner,setOwner]=useState('qa-A'),[text,setText]=useState(''),[visible,setVisible]=useState(true);
 return <section className="max-w-xl mx-auto p-6 pt-32 space-y-4"><h1>Validation locale des brouillons</h1><p>Aucun compte réel ni publication. Texte de test uniquement, dans cet onglet.</p><label>Compte de test<select aria-label="Compte de test" value={owner} onChange={e=>{setText('');setOwner(e.target.value);}}><option value="qa-A">A</option><option value="qa-B">B</option></select></label><button type="button" onClick={()=>setVisible(v=>!v)}>{visible?'Quitter le formulaire':'Rouvrir le formulaire'}</button>{visible&&<><label>Texte du brouillon<textarea aria-label="Texte du brouillon" className="w-full text-black" value={text} onChange={e=>setText(e.target.value)} /></label><DraftRecovery owner={owner} scope="journey-lab" fields={{text}} empty={!text.trim()} reset={()=>setText('')} apply={d=>setText(d.text||'')} /></>}</section>;
}
