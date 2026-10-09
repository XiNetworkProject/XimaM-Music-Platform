'use client';
import { useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';
export default function StudioTrackStyle({ style }: { style: string }) {
  const [notice, setNotice] = useState('');
  return <div className="sc-track-style"><details><summary>Style <ChevronDown size={14}/></summary><p>{style || 'Aucun style renseigné.'}</p></details>{style && <button aria-label="Copier le style du morceau" onClick={async () => { try { await navigator.clipboard.writeText(style); setNotice('Style copié'); } catch { setNotice('Copie indisponible : sélectionnez le texte.'); } }}><Copy size={14}/></button>}<span role="status">{notice}</span></div>;
}
