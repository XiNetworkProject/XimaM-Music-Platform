'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, X } from 'lucide-react';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';

export type StudioTrackEdit = { title: string; cover?: File };
export default function StudioTrackEditor({ track, save, close }: { track: GeneratedTrack; save: (track: GeneratedTrack, edit: StudioTrackEdit) => Promise<void>; close: () => void }) {
  const [title, setTitle] = useState(track.title);
  const [cover, setCover] = useState<File>();
  const [preview, setPreview] = useState(track.imageUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!cover) return; const url = URL.createObjectURL(cover); setPreview(url); return () => URL.revokeObjectURL(url); }, [cover]);
  const choose = (file?: File) => {
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 25 * 1024 * 1024) { setError('Choisissez une image JPG, PNG, WebP ou GIF de 25 Mo maximum.'); return; }
    setCover(file); setError('');
  };
  return <form className="sw-track-edit" aria-label={`Modifier ${track.title}`} onSubmit={async event => {
    event.preventDefault(); if (locked.current || !title.trim()) return;
    locked.current = true; setBusy(true); setError('');
    try { await save(track, { title: title.trim(), cover }); close(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Modification impossible. Réessayez.'); }
    finally { locked.current = false; setBusy(false); }
  }} onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); close(); } }}>
    <button type="button" className="sw-edit-cover" disabled={busy} aria-label="Choisir ou déposer une pochette" onClick={() => picker.current?.click()} onDragOver={event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }} onDrop={event => { event.preventDefault(); event.stopPropagation(); choose(event.dataTransfer.files[0]); }}>{preview && <img src={preview} alt="Nouvelle pochette"/>}<ImagePlus size={22}/></button>
    <input ref={picker} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => choose(event.target.files?.[0])}/>
    <label>Titre<input aria-label="Titre du morceau" autoFocus maxLength={160} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} required/><small>{cover ? cover.name : 'Déposez une image sur la pochette pour la remplacer.'}</small></label>
    <button className="us-icon" type="submit" disabled={busy || !title.trim()} aria-label="Enregistrer le titre et la pochette">{busy ? <Loader2 size={18} className="us-spin"/> : <Check size={18}/>}</button>
    <button className="us-icon" type="button" disabled={busy} onClick={close} aria-label="Annuler la modification"><X size={18}/></button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
