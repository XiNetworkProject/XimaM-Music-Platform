'use client';

import { useEffect, useState } from 'react';
import { Search, BookmarkPlus, Trash2 } from 'lucide-react';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';
import type { UnifiedStudioProps } from './UnifiedStudio';
import { feedbackFailure } from '@/lib/studio/feedback';
import { reportStudioActivity } from '@/lib/studio/clientActivity';

type Snippet = { id: string; title: string; text: string };
/** Own-track snippets plus device-local, account-scoped saved text. Never edits a song. */
export default function StudioTextLibrary({ studio: p, kind, onClose, onChoose }: { studio: UnifiedStudioProps; kind: 'style' | 'lyrics'; onClose: () => void; onChoose: (text: string) => void }) {
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<Snippet[]>([]);
  const [error, setError] = useState('');
  const key = `synaura.studio.text.${p.owner || 'demo'}.${kind}`;
  useEffect(() => {
    try { const raw = JSON.parse(localStorage.getItem(key) || '[]'); setSaved(Array.isArray(raw) ? raw.filter(item => typeof item?.id === 'string' && typeof item?.text === 'string' && typeof item?.title === 'string').slice(0, 50) : []); } catch { setSaved([]); }
  }, [key]);
  const fail = (message: string) => { setError(message); reportStudioActivity(p.owner, { kind, stage: 'Bibliothèque de textes', ...feedbackFailure(message) }); };
  const persist = (next: Snippet[]) => { try { localStorage.setItem(key, JSON.stringify(next)); setSaved(next); setError(''); } catch { fail('Le stockage de cet appareil est indisponible. Ce brouillon n’a pas été enregistré.'); } };
  const choose = (text: string) => {
    if (!text.trim()) { fail('Ce texte est vide. Aucun changement effectué.'); return; }
    if (text.length > (kind === 'lyrics' ? 5000 : 1000)) { fail(`Ce texte dépasse la limite de ${kind === 'lyrics' ? 5000 : 1000} caractères. Raccourcissez-le avant de l’utiliser.`); return; }
    onChoose(text);
    if (kind === 'lyrics') p.form.instrumental.set(false);
    if (p.form.mode.value === 'simple') p.form.mode.set('custom');
    reportStudioActivity(p.owner, { kind, stage: 'Application au brouillon', state: 'success', message: kind === 'lyrics' ? 'Paroles insérées et voix activée. Aucune génération lancée.' : 'Style inséré dans la composition. Aucune génération lancée.' });
    onClose();
  };
  const current = p.form[kind].value;
  const tracks = p.library.songs.filter(song => !song.trashed && song.track[kind]).map(song => ({ id: song.track.id, title: song.track.title, text: song.track[kind] }));
  const render = (items: Snippet[], local: boolean) => items.filter(item => `${item.title} ${item.text}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(item => <div className="sc-saved-item" key={item.id}><button onClick={() => choose(item.text)}><strong>{item.title || 'Sans titre'}</strong><span>{item.text}</span></button>{local && <button aria-label={`Supprimer le brouillon ${item.title}`} onClick={() => persist(saved.filter(row => row.id !== item.id))}><Trash2 size={15}/></button>}</div>);
  return <SynauraOverlay open onClose={onClose} ariaLabel={kind === 'style' ? 'Bibliothèque de styles' : 'Bibliothèque de paroles'} size="md"><div className="sc-text-library"><h2>{kind === 'style' ? 'Vos styles' : 'Vos paroles'}</h2><label className="sc-library-search"><Search size={16}/><input aria-label="Rechercher dans les textes" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…"/></label><button className="sc-library-save" disabled={!current.trim() || saved.length >= 50} onClick={() => persist([{ id: crypto.randomUUID(), title: p.form.title.value || current.slice(0, 45), text: current }, ...saved])}><BookmarkPlus size={16}/>Enregistrer ce brouillon sur cet appareil</button>{error && <p role="alert">{error}</p>}<h3>Brouillons sur cet appareil</h3>{saved.length ? render(saved, true) : <p>Aucun brouillon enregistré.</p>}<h3>Depuis vos morceaux</h3>{tracks.length ? render(tracks, false) : <p>Aucun texte disponible dans vos morceaux.</p>}</div></SynauraOverlay>;
}
