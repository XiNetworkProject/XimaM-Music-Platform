'use client';

import { useEffect, useRef, useState } from 'react';
import { Undo2, Redo2, Library, Maximize2, Wand2, ArrowUp, ChevronRight, X, Loader2 } from 'lucide-react';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';
import type { UnifiedStudioProps } from './UnifiedStudio';
import StudioTextLibrary from './StudioTextLibrary';
import { feedbackFailure } from '@/lib/studio/feedback';
import { reportStudioActivity, startStudioActivity } from '@/lib/studio/clientActivity';

type Variant = { text: string; title?: string };
const ideas = ['Écris un hymne punk sur le besoin de liberté, en français.', 'Une chanson douce sur une rencontre sous les aurores boréales.', 'Un refrain pop joyeux sur un nouveau départ.'];

export default function StudioLyricsEditor({ studio: p }: { studio: UnifiedStudioProps }) {
  const field = p.form.lyrics;
  const history = useRef({ values: [field.value], index: 0 });
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [library, setLibrary] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [idea, setIdea] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [choice, setChoice] = useState(0);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [status, setStatus] = useState('');
  const lock = useRef(false);
  const abort = useRef<AbortController>();
  const activity = useRef('');
  const terminalFailure = useRef(false);
  const key = `synaura.studio.lyrics.pending.${p.owner || 'demo'}`;
  useEffect(() => {
    const h = history.current;
    if (field.value !== h.values[h.index]) { h.values = [...h.values.slice(0, h.index + 1), field.value].slice(-100); h.index = h.values.length - 1; setRevision(value => value + 1); }
  }, [field.value]);
  useEffect(() => {
    try { const stored = JSON.parse(sessionStorage.getItem(key) || 'null'); if (stored?.taskId && Date.now() - stored.at < 86400000) { setPending(stored.taskId); setAssistant(true); } } catch {}
    return () => abort.current?.abort();
  }, [key]);
  const undo = (delta: number) => { const h = history.current; h.index = Math.max(0, Math.min(h.values.length - 1, h.index + delta)); field.set(h.values[h.index]); setRevision(value => value + 1); };
  const remember = (taskId: string) => { setPending(taskId); try { if (taskId) sessionStorage.setItem(key, JSON.stringify({ taskId, at: Date.now() })); else sessionStorage.removeItem(key); } catch {} };
  const accept = (data: { variants?: Variant[]; best?: string; taskId?: string; providerStatus?: string; errorMessage?: string }) => {
    const results = (Array.isArray(data.variants) ? data.variants : []).filter(v => typeof v?.text === 'string' && v.text.trim()).slice(0, 8);
    if (!results.length && typeof data.best === 'string' && data.best.trim()) results.push({ text: data.best });
    if (results.length) { setVariants(results); setChoice(0); remember(''); setStatus('Choisissez une proposition avant de l’insérer.'); reportStudioActivity(p.owner, { id: activity.current, kind: 'lyrics', stage: 'Propositions reçues', state: 'success', message: 'Paroles disponibles. Choisissez une proposition puis « Utiliser ces paroles » pour l’appliquer.' }); return true; }
    if (/FAIL|ERROR/.test(data.providerStatus || '')) { terminalFailure.current = true; remember(''); throw new Error(data.errorMessage || 'Le fournisseur a signalé un échec des paroles, sans préciser de cause.'); }
    if (data.taskId) remember(data.taskId);
    return false;
  };
  const generate = async () => {
    if (lock.current || uncertain || (!pending && !prompt.trim())) return;
    lock.current = true; setBusy(true); setError(''); setStatus(pending ? 'Vérification des paroles…' : 'Écriture des paroles…');
    const controller = new AbortController(); abort.current = controller;
    let taskId = pending;
    terminalFailure.current = false;
    activity.current = startStudioActivity(p.owner, 'lyrics', taskId ? 'Vérification de la demande' : 'Demande au parolier', taskId ? `lyrics:${taskId}` : undefined);
    let responseStatus: number | undefined;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 90000);
    try {
      if (p.toolsDemo) { setVariants([{ title: 'Exemple de démonstration', text: '[Couplet]\nSous les étoiles, une idée prend vie\n[Refrain]\nEt la musique nous réunit' }]); setChoice(0); setStatus('Démonstration locale : aucun appel IA.'); return; }
      const response = await fetch(taskId ? `/api/suno/generate-lyrics?taskId=${encodeURIComponent(taskId)}` : '/api/suno/generate-lyrics', { method: taskId ? 'GET' : 'POST', ...(taskId ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim() }) }), signal: controller.signal });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) { responseStatus = response.status; if (!taskId && response.status >= 500) setUncertain(true); throw new Error(data.error || 'Impossible de récupérer les paroles.'); }
      taskId = typeof data.taskId === 'string' ? data.taskId : taskId;
      if (accept(data)) return;
      if (!taskId) { setUncertain(true); throw new Error('Réponse incomplète : ne relancez pas immédiatement une autre génération.'); }
      // Bounded polling; resuming always checks the SAME task, never another POST.
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise<void>((resolve, reject) => { const cancel = () => { clearTimeout(timer); reject(new DOMException('Annulé', 'AbortError')); }; const timer = setTimeout(() => { controller.signal.removeEventListener('abort', cancel); resolve(); }, 4000); controller.signal.addEventListener('abort', cancel, { once: true }); });
        if (document.visibilityState !== 'visible') break;
        const check = await fetch(`/api/suno/generate-lyrics?taskId=${encodeURIComponent(taskId)}`, { signal: controller.signal });
        if (!check.ok) { responseStatus = check.status; const failure = await check.json().catch(() => ({})); throw new Error(failure.error || 'Le suivi des paroles est momentanément indisponible.'); }
        const result = await check.json();
        if (controller.signal.aborted) return;
        if (accept(result)) return;
      }
      setStatus('Toujours en cours. « Vérifier » reprend cette même demande, sans en créer une autre.');
      reportStudioActivity(p.owner, { id: activity.current, kind: 'lyrics', taskId, stage: 'Écriture en cours', state: 'pending', message: 'Aucun résultat définitif reçu. Le bouton « Vérifier » dans le parolier reprend cette demande sans en créer une autre.' });
    } catch (cause) { if (!controller.signal.aborted || timedOut) {
      if (!taskId && (timedOut || cause instanceof TypeError)) setUncertain(true);
      const message = timedOut ? 'Le service met trop de temps à répondre. Aucune nouvelle demande n’a été lancée.' : cause instanceof Error ? cause.message : 'Paroles indisponibles.';
      setError(message); setStatus('');
      reportStudioActivity(p.owner, { id: activity.current, kind: 'lyrics', taskId, stage: taskId ? 'Suivi du parolier' : 'Envoi au parolier', ...feedbackFailure(message, { status: responseStatus, uncertain: !terminalFailure.current && (timedOut || cause instanceof TypeError || !!responseStatus && responseStatus >= 500) }), advice: taskId && !terminalFailure.current ? 'Le bouton « Vérifier » dans le parolier consulte la même demande, sans frais de nouvelle génération.' : 'Aucune relance automatique. Vérifiez votre consigne avant de lancer une autre demande.' });
    } }
    finally { clearTimeout(timeout); lock.current = false; if (!controller.signal.aborted || timedOut) setBusy(false); }
  };
  const applyVariant = (append = false) => {
    const proposal = variants[choice]?.text || '';
    const text = append ? [field.value, proposal].filter(Boolean).join('\n\n') : proposal;
    if (!proposal.trim() || text.length > 5000) {
      const message = !proposal.trim() ? 'Cette proposition est vide.' : 'Le texte dépasserait 5 000 caractères. Votre brouillon n’a pas été modifié.';
      setError(message); reportStudioActivity(p.owner, { kind: 'lyrics', stage: 'Insertion dans le brouillon', ...feedbackFailure(message) }); return;
    }
    field.set(text); p.form.instrumental.set(false); setError(''); setStatus('Paroles insérées. Annuler permet de retrouver votre texte.');
    reportStudioActivity(p.owner, { kind: 'lyrics', stage: 'Insertion dans le brouillon', state: 'success', message: 'Paroles insérées et voix activée. Aucune musique générée automatiquement.' });
  };
  const editor = (full = false) => <textarea aria-label={full ? 'Paroles en plein écran' : 'Paroles'} value={field.value} maxLength={5000} rows={full ? 18 : 5} onChange={event => field.set(event.target.value)} placeholder="Écrivez vos paroles, ou ouvrez le parolier pour partir d’une idée…"/>;
  return <div className="sc-lyrics-editor" data-history={revision}>
    <div className="sc-lyrics-toolbar"><button className="us-toggle" role="switch" aria-checked={p.form.instrumental.value} onClick={() => p.form.instrumental.set(!p.form.instrumental.value)}><span className="us-switch"><i/></span>Instrumental</button><span/>
      <button title="Annuler" aria-label="Annuler la modification des paroles" disabled={!history.current.index} onClick={() => undo(-1)}><Undo2 size={15}/></button><button title="Rétablir" aria-label="Rétablir la modification des paroles" disabled={history.current.index >= history.current.values.length - 1} onClick={() => undo(1)}><Redo2 size={15}/></button><button title="Vos paroles" aria-label="Bibliothèque de paroles" onClick={() => setLibrary(true)}><Library size={15}/></button><button title="Agrandir" aria-label="Agrandir les paroles" onClick={() => setExpanded(true)}><Maximize2 size={15}/></button>
    </div>
    {!p.form.instrumental.value ? <>{editor()}<button className="us-text-button sc-assistant-toggle" aria-expanded={assistant} onClick={() => setAssistant(value => !value)}><Wand2 size={14}/>Parolier IA</button>
      {assistant && <div className="sc-lyric-assistant"><div className="sc-lyric-idea"><button onClick={() => setPrompt(ideas[idea])}>{ideas[idea]}</button><button aria-label="Autre idée de paroles" onClick={() => setIdea(value => (value + 1) % ideas.length)}><ChevronRight size={15}/></button><button aria-label="Fermer le parolier" onClick={() => setAssistant(false)}><X size={15}/></button></div><label><span className="sr-only">Consigne du parolier</span><textarea rows={2} maxLength={200} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Un sujet, une langue, une émotion…" disabled={busy || !!pending}/></label><div className="sc-assistant-submit"><small>{prompt.length}/200</small><button aria-label={pending ? 'Vérifier les paroles en cours' : 'Générer une proposition de paroles'} disabled={busy || uncertain || (!pending && !prompt.trim())} onClick={() => void generate()}>{busy ? <Loader2 size={16} className="us-spin"/> : pending ? 'Vérifier' : <ArrowUp size={17}/>}</button></div>{status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}{uncertain && <p>La réponse a été perdue. Pour éviter une double demande, la relance automatique est bloquée.</p>}
      {variants.length > 0 && <div className="sc-lyric-result"><select aria-label="Proposition de paroles" value={choice} onChange={e => setChoice(Number(e.target.value))}>{variants.map((variant, i) => <option value={i} key={i}>{variant.title || `Proposition ${i + 1}`}</option>)}</select><pre>{variants[choice]?.text}</pre><div><button onClick={() => applyVariant()}>Utiliser ces paroles</button><button onClick={() => applyVariant(true)}>Ajouter à la suite</button></div></div>}
      </div>}</> : <p className="sc-help">Sans voix. Vos paroles restent conservées dans le brouillon.</p>}
    <SynauraOverlay open={expanded} onClose={() => setExpanded(false)} ariaLabel="Éditeur de paroles" size="lg"><div className="sc-expanded-lyrics"><h2>Vos paroles</h2>{editor(true)}<small>{field.value.length}/5000 · Modifications conservées dans votre brouillon</small></div></SynauraOverlay>
    {library && <StudioTextLibrary studio={p} kind="lyrics" onClose={() => setLibrary(false)} onChoose={field.set}/>}
  </div>;
}
