'use client';

import { useState } from 'react';
import UnifiedStudio, { type StudioSong } from '@/components/ai-studio/UnifiedStudio';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';

// Presentation-only fixture, unavailable in production. Never calls a provider or database.
const examples: StudioSong[] = ['Après minuit', 'Bleu électrique', 'On recommence', 'Loin du bruit', 'Éclats de nous', 'Sans gravité'].map((title, index) => ({
  track: { id: `fixture-${index}`, title, style: ['Synth-pop · Nocturne', 'Électronique · Énergie', 'Pop française · Solaire'][index % 3], lyrics: index === 0 ? '[Couplet]\nLa ville s’éveille quand le jour s’endort.\n[Refrain]\nOn invente encore.' : '', prompt: '', duration: 143 + index * 17, createdAt: `2026-09-${18 - index}T12:00:00Z`, imageUrl: '/default-cover.svg', audioUrl: '', isInstrumental: false }, liked: index === 1, trashed: false, published: index === 2, model: index % 2 ? 'V6' : 'V6 Mini',
}));
function useField<T,>(initial: T) { const [value, set] = useState(initial); return { value, set }; }
export default function StudioLab() {
  const mode = useField<'simple' | 'custom' | 'remix'>('simple');
  const description = useField(''); const title = useField(''); const style = useField(''); const lyrics = useField('');
  const instrumental = useField(false); const model = useField('V6_MINI'); const duration = useField(120);
  const weirdness = useField(50); const styleInfluence = useField(50); const audioWeight = useField(50);
  const negativeTags = useField(''); const vocalGender = useField('');
  const [songs, setSongs] = useState(examples);
  const [selected, select] = useState<GeneratedTrack | null>(null);
  const [notice, setNotice] = useState('Aperçu local · données de démonstration · aucune génération ni publication réelle');
  const [scenario, setScenario] = useState('collection');
  const demo = () => setNotice('Action de démonstration uniquement. Aucun appel fournisseur, aucun crédit consommé.');
  return <><div style={{ background: '#232a3d', color: '#d4ddff', padding: '8px 18px', fontSize: 11, display: 'flex', flexWrap: 'wrap', gap: 14 }}><span role="status">{notice}</span><label>Scénario <select aria-label="Scénario de test" value={scenario} onChange={e => setScenario(e.target.value)} style={{ background: '#151c2b' }}><option value="collection">Collection</option><option value="empty">Vide</option><option value="loading">Chargement</option><option value="error">Erreur</option><option value="pending">Génération</option><option value="free">Compte gratuit</option><option value="zero">Sans crédits</option></select></label></div><UnifiedStudio authenticated quotaLoading={false} credits={scenario === 'zero' ? 0 : 138} buyCredits={demo}
    form={{ mode, description, title, style, lyrics, instrumental, model, allowedModels: scenario === 'free' ? ['V6_MINI'] : ['V6_MINI', 'V6', 'V6_WILD'], duration, weirdness, styleInfluence, audioWeight, negativeTags, vocalGender, tags: [], clearTags: demo, remixSource: <p className="us-source-credit">Import audio indisponible dans cet aperçu hors ligne.</p>, remixReady: false, remixOptions: null, sourceCredit: null }}
    generation={{ busy: false, pending: scenario === 'pending', progress: 42, status: 'Génération en cours', error: null, cooldown: 0, submit: async () => { demo(); }, lyricsBusy: false, generateLyrics: async () => { demo(); } }}
    library={{ songs: ['empty', 'loading', 'error'].includes(scenario) ? [] : songs, loading: scenario === 'loading', error: scenario === 'error' ? 'Impossible de charger la bibliothèque.' : null, refresh: demo, fresh: [] }}
    selected={selected} select={select}
    actions={{ play: demo, download: demo, share: demo, remix: track => { mode.set('remix'); title.set(track.title); style.set(track.style); }, reuse: track => { mode.set('custom'); title.set(track.title); style.set(track.style); lyrics.set(track.lyrics); }, copyLyrics: demo, like: track => setSongs(items => items.map(item => item.track.id === track.id ? { ...item, liked: !item.liked } : item)), trash: track => setSongs(items => items.map(item => item.track.id === track.id ? { ...item, trashed: !item.trashed } : item)), folder: demo, video: demo, videoBusy: false, publish: async () => { demo(); }, publishBusy: false, published: songs.find(item => item.track.id === selected?.id)?.published || false, permissions: <p>Droits existants conservés dans le studio connecté.</p>, timedLyrics: null }} modals={null} /></>;
}
