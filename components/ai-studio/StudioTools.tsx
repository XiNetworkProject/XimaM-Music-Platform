'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Clock, Download, Layers, Loader2, Play, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';
import { STUDIO_GROUPS, STUDIO_KEYS, STUDIO_STEMS, STUDIO_TOOLS, parseStudioInput, studioToolOffer, toolNeedsSource, type StudioTool, type StudioToolInput, type StudioJobView } from '@/lib/studio/tools';
import { studioCreditsLabel } from '@/lib/studio/pricing';
import { CURRENT_SUNO_MODELS } from '@/lib/sunoModels';
import { encodeStudioMidi } from '@/lib/studio/midi';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';
import type { StudioSong } from './UnifiedStudio';
import type { StudioTasks } from './useStudioTasks';
import { feedbackFailure } from '@/lib/studio/feedback';
import { reportStudioActivity } from '@/lib/studio/clientActivity';
import './studio-tools.css';

type Props = { open: boolean; onClose: () => void; source: GeneratedTrack | null; songs: StudioSong[]; models: readonly string[]; play: (track: GeneratedTrack) => void; refresh: () => void; applyStyle: (style: string) => void; demo?: boolean; tasks: StudioTasks; initialAction?: StudioTool; initialPrompt?: string; activity?: boolean; embedded?: boolean; launchKey: number; onResult?: (trackId: string) => void };
const labels = { submitting: 'Envoi en cours', pending: 'En cours', uncertain: 'À vérifier', completed: 'Terminé', failed: 'Échec' };
const emptyForm = (source: GeneratedTrack | null, model: string): StudioToolInput => ({ action: 'extend', sourceId: source?.id || '', model, title: source?.title || '', style: source?.style || '', lyrics: source?.lyrics || '', fullLyrics: source?.lyrics || '', start: source ? Math.max(1, Math.floor(source.duration - 15)) : 1, end: source?.duration || 30, variety: 1, stemName: 'Piano', key: 'Any', instrumental: source?.isInstrumental || false });
function ToolPrice({ offer }: { offer: ReturnType<typeof studioToolOffer> | StudioTasks['capabilities'][number] | undefined }) {
  const credits = offer?.displayCredits ?? offer?.credits;
  return <span className="st-tool-price" data-free={credits === 0} data-pending={!offer?.enabled}>{credits == null ? offer?.unavailableReason === 'pricing_review' ? 'Coût à confirmer' : 'Tarif indisponible' : `${offer?.enabled ? '' : 'Prévu · '}${studioCreditsLabel(credits)}`}</span>;
}

export default function StudioTools(p: Props) {
  const [screen, setScreen] = useState<'tools' | 'jobs' | 'form'>('tools');
  const [form, setForm] = useState<StudioToolInput>(() => emptyForm(p.source, p.models[0] || 'V6_MINI'));
  const { jobs, capabilities, loading } = p.tasks;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const request = useRef<{ key: string; body: string } | null>(null);
  const submitLock = useRef(false);
  const drafts = useRef(new Map<string, StudioToolInput>());
  const formRef = useRef(form); formRef.current = form;
  const launchRef = useRef(p.launchKey); launchRef.current = p.launchKey;
  const tool = STUDIO_TOOLS.find(item => item.id === form.action)!;
  const capability = capabilities.find(item => item.id === form.action);
  const displayOffer = p.demo ? studioToolOffer(form.action, {}, false) : capability;
  useEffect(() => { setConfirm(false); }, [capability?.credits, capability?.enabled]);
  const source = p.songs.find(song => song.track.id === form.sourceId)?.track;
  const availableSongs = p.songs.filter(song => !song.trashed);
  const visibleJobs = !p.activity && source ? jobs.filter(job => job.sourceIds?.includes(source.id)) : jobs;
  const priorResult = source && jobs.some(job => job.status === 'completed' && job.action === form.action && job.sourceIds?.includes(source.id));
  const completedStems = jobs.filter(job => job.status === 'completed' && job.action.startsWith('stems') && (!form.sourceId || job.sourceIds?.includes(form.sourceId)));
  const personas = jobs.filter(job => job.action === 'persona' && job.status === 'completed');
  const update = <K extends keyof StudioToolInput,>(key: K, value: StudioToolInput[K]) => { setForm(previous => ({ ...previous, [key]: value })); setConfirm(false); setError(''); };
  useEffect(() => {
    const previous = formRef.current;
    drafts.current.set(`${previous.action}:${previous.sourceId || ''}`, previous);
    if (!p.activity) {
      const sourceModel = CURRENT_SUNO_MODELS.find(model => model.label === p.songs.find(song => song.track.id === p.source?.id)?.model)?.id;
      const action = p.initialAction || 'extend';
      setForm(drafts.current.get(`${action}:${p.source?.id || ''}`) || { ...emptyForm(p.source, sourceModel && p.models.includes(sourceModel) ? sourceModel : p.models.includes('V6_MINI') ? 'V6_MINI' : p.models[0]), action, prompt: p.initialPrompt || '', workspace: p.songs.find(song => song.track.id === p.source?.id)?.folder });
    }
    setScreen(p.activity ? 'jobs' : p.initialAction ? 'form' : 'tools'); setConfirm(false); setError(''); setNotice('');
    // Keep an independent draft for each operation/source while this Studio is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.launchKey]);
  const selectTool = (action: StudioTool) => { setForm(old => ({ ...old, action })); setError(''); setNotice(''); setConfirm(false); setScreen('form'); };
  const submit = async () => {
    if (submitLock.current || !capability?.enabled || capability.credits == null || p.demo) return;
    let input: StudioToolInput;
    try { input = parseStudioInput(form); } catch (e) { setError((e as Error).message); reportStudioActivity(p.tasks.owner, { kind: form.action === 'style' ? 'style' : 'tool', stage: 'Validation des réglages', ...feedbackFailure(e) }); return; }
    if (!confirm) { setConfirm(true); return; }
    const body = JSON.stringify({ ...input, expectedCredits: capability.credits });
    if (!request.current || request.current.body !== body) request.current = { key: crypto.randomUUID(), body };
    submitLock.current = true; setBusy(true); setError('');
    const launchedFrom = p.launchKey;
    let responseStatus: number | undefined;
    try {
      const response = await fetch('/api/studio/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': request.current.key }, body });
      const data = await response.json();
      if (!response.ok) { responseStatus = response.status; throw new Error(data.error || 'La demande n’a pas été confirmée.'); }
      p.tasks.accept(data.job);
      if (launchRef.current === launchedFrom) { setScreen('jobs'); setConfirm(false); }
      request.current = null; // Accepted intent finished; an explicit future launch may create another version.
      p.refresh();
    } catch (e) { if (launchRef.current === launchedFrom) setError(e instanceof Error ? e.message : 'Connexion interrompue. Consultez vos tâches avant de relancer.'); reportStudioActivity(p.tasks.owner, { id: `tool-submit:${request.current?.key}`, kind: form.action === 'style' ? 'style' : 'tool', stage: 'Envoi de la demande', ...feedbackFailure(e, { status: responseStatus, uncertain: !responseStatus || responseStatus >= 500 }) }); void p.tasks.refresh(); }
    finally { submitLock.current = false; setBusy(false); }
  };
  const musical = tool.music && form.action !== 'sounds';
  const content = <section className="unified-studio st-atelier">
      <header className="st-heading"><button className="us-text-button" onClick={p.onClose}><ArrowLeft size={15} />Revenir à la composition</button><h2 tabIndex={-1}>{screen === 'jobs' ? 'Activité & exports' : screen === 'form' ? tool.label : 'Outils de création'}</h2>{source && screen === 'form' && <div className="st-source-context">{source.imageUrl && <img src={source.imageUrl} alt="" />}<span><small>À partir de</small><strong>{source.title}</strong></span><button className="us-icon" aria-label={`Écouter la source : ${source.title}`} onClick={() => p.play(source)}><Play size={16}/></button></div>}<div className="st-tabs" role="group" aria-label="Atelier"><button aria-pressed={screen !== 'jobs'} onClick={() => { setScreen(p.initialAction ? 'form' : 'tools'); setConfirm(false); }}><SlidersHorizontal size={15} />{p.initialAction ? 'Réglages' : 'Les outils'}</button><button aria-pressed={screen === 'jobs'} onClick={() => setScreen('jobs')}><Clock size={15} />Activité{jobs.some(job => job.status === 'pending') && <span className="us-dot" />}</button></div></header>
      {p.tasks.error && <p className="us-error" role="status">{p.tasks.error}<button className="us-text-button" onClick={() => void p.tasks.refresh()}>Réessayer le suivi</button></p>}
      {error && <p className="us-error" role="alert">{error}</p>}{notice && <p className="st-notice" role="status">{notice}</p>}
      {loading && <p className="st-status" role="status"><Loader2 className="us-spin" size={16} />Chargement de votre atelier…</p>}
      {screen === 'tools' && <div className="st-catalog"><p className="st-price-guide">Un coût par demande, pas par résultat. Retrouver un export déjà créé ne relance aucun traitement.</p>{STUDIO_GROUPS.map(group => <section key={group}><h3>{group}</h3><div className="st-tool-grid">{STUDIO_TOOLS.filter(item => item.group === group).map(item => <button key={item.id} className="st-tool" onClick={() => selectTool(item.id)}><span className="st-tool-icon">{item.group === 'Exporter' ? <Layers size={20} /> : <Sparkles size={20} />}</span><span><strong>{item.label}</strong><small>{item.hint}</small><ToolPrice offer={p.demo ? studioToolOffer(item.id, {}, false) : capabilities.find(offer => offer.id === item.id)} /></span><ArrowUpRight size={16} /></button>)}</div></section>)}<p className="st-footnote">Vos originaux restent intacts. Les nouvelles versions sont privées.</p></div>}
      {screen === 'form' && <div className="st-form"><div className="st-price-summary"><p className="st-muted">{tool.hint}</p><ToolPrice offer={displayOffer} /></div>
        {priorResult && <button className="us-secondary" onClick={() => setScreen('jobs')}><Check size={15}/>Un résultat existe déjà · le retrouver sans frais</button>}
        {toolNeedsSource(form.action) && <label className="us-field">Morceau source<select value={form.sourceId || ''} onChange={e => { const next = availableSongs.find(song => song.track.id === e.target.value)?.track; setForm({ ...emptyForm(next || null, form.model || 'V6_MINI'), action: form.action }); setConfirm(false); }}><option value="">Choisir dans ma collection</option>{availableSongs.map(song => <option key={song.track.id} value={song.track.id}>{song.track.title} · {Math.floor(song.track.duration / 60)}:{String(Math.floor(song.track.duration % 60)).padStart(2, '0')}</option>)}</select></label>}
        {form.action === 'mashup' && <label className="us-field">Second morceau<select value={form.secondSourceId || ''} onChange={e => update('secondSourceId', e.target.value)}><option value="">Choisir un autre morceau</option>{availableSongs.filter(song => song.track.id !== form.sourceId).map(song => <option key={song.track.id} value={song.track.id}>{song.track.title} · {Math.floor(song.track.duration / 60)}:{String(Math.floor(song.track.duration % 60)).padStart(2, '0')}</option>)}</select></label>}
        {form.action === 'midi' && <label className="us-field">Pistes séparées<select value={form.stemJobId || ''} onChange={e => update('stemJobId', e.target.value)}><option value="">Choisir une séparation terminée</option>{completedStems.map(job => <option key={job.id} value={job.id}>{job.title} · {new Date(job.createdAt).toLocaleDateString('fr-FR')}</option>)}</select>{!completedStems.length && <button className="us-text-button" onClick={() => selectTool('stems_multi')}>Séparer les pistes d’abord <ArrowUpRight size={14} /></button>}</label>}
        {['extend', 'replace', 'persona'].includes(form.action) && <div className="st-range-fields"><label className="us-field">{form.action === 'extend' ? 'Reprendre à (secondes)' : 'Début (secondes)'}<input type="number" min={form.action === 'extend' ? 0.01 : 0} step="0.01" max={source?.duration || 480} value={form.start ?? ''} onChange={e => update('start', e.target.value === '' ? undefined : Number(e.target.value))} /></label>{form.action !== 'extend' && <label className="us-field">Fin (secondes)<input type="number" min="0" step="0.01" max={source?.duration || 480} value={form.end ?? ''} onChange={e => update('end', e.target.value === '' ? undefined : Number(e.target.value))} /></label>}{source && <button className="us-secondary" onClick={() => p.play(source)}><Play size={14} />Écouter l’original</button>}</div>}
        {(musical || form.action === 'persona') && <label className="us-field">Titre<input value={form.title || ''} maxLength={80} onChange={e => update('title', e.target.value)} /></label>}
        {musical && <><label className="us-field">Direction musicale<textarea rows={2} value={form.style || ''} maxLength={1000} onChange={e => update('style', e.target.value)} placeholder="Style, instruments, ambiance…" /></label><label className="us-field">{form.action === 'replace' ? 'Paroles du nouveau passage' : 'Paroles'}<textarea rows={4} value={form.lyrics || ''} maxLength={5000} onChange={e => update('lyrics', e.target.value)} /></label></>}
        {form.action === 'replace' && <label className="us-field">Paroles complètes du morceau<textarea rows={4} value={form.fullLyrics || ''} maxLength={5000} onChange={e => update('fullLyrics', e.target.value)} /><small>Passage de 10 secondes minimum. Une nouvelle version sera créée.</small></label>}
        {form.action === 'persona' && <label className="us-field">Identité à conserver<textarea rows={3} value={form.description || ''} maxLength={1000} onChange={e => update('description', e.target.value)} placeholder="Une voix feutrée, des textures nocturnes…" /></label>}
        {['sounds', 'style'].includes(form.action) && <label className="us-field">Votre idée<textarea rows={4} maxLength={500} value={form.prompt || ''} onChange={e => update('prompt', e.target.value)} placeholder={form.action === 'sounds' ? 'Une boucle de piano doux, un souffle cosmique…' : 'Indie-pop, guitares chaudes et refrain lumineux…'} /></label>}
        {form.action === 'sounds' && <><label className="st-check"><input type="checkbox" checked={!!form.loop} onChange={e => update('loop', e.target.checked)} />Créer une boucle</label><div className="st-range-fields"><label className="us-field">Tempo · facultatif<input type="number" min="1" max="300" value={form.tempo ?? ''} placeholder="Auto" onChange={e => update('tempo', e.target.value === '' ? undefined : Number(e.target.value))} /></label><label className="us-field">Tonalité<select value={form.key} onChange={e => update('key', e.target.value)}>{STUDIO_KEYS.map(key => <option key={key} value={key}>{key === 'Any' ? 'Automatique' : key}</option>)}</select></label></div></>}
        {form.action === 'stems_instrument' && <label className="us-field">Instrument<select value={form.stemName} onChange={e => update('stemName', e.target.value)}>{STUDIO_STEMS.map(stem => <option key={stem}>{stem}</option>)}</select></label>}
        {tool.music && <label className="us-field">Enregistrer dans le dossier<input maxLength={120} value={form.workspace ?? p.songs.find(song => song.track.id === form.sourceId)?.folder ?? ''} onChange={e => update('workspace', e.target.value)} placeholder="Sans dossier"/><small>L’original reste à sa place.</small></label>}
        {tool.music && <label className="us-field">Modèle<select value={form.model} onChange={e => update('model', e.target.value)}>{CURRENT_SUNO_MODELS.filter(model => p.models.includes(model.id)).map(model => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>}
        {musical && <details className="us-advanced"><summary>Réglages<SlidersHorizontal size={15} /></summary><div className="us-advanced-fields"><label className="us-field">Variété<select value={form.variety} onChange={e => update('variety', Number(e.target.value))}>{['Style exact', 'Équilibrée', 'Élevée', 'Audacieuse', 'Maximale'].map((label, value) => <option key={value} value={value}>{label}</option>)}</select></label>{personas.length > 0 && <label className="us-field">Persona<select value={form.personaJobId || ''} onChange={e => update('personaJobId', e.target.value || undefined)}><option value="">Aucune</option>{personas.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>}<label className="us-field">À éviter<input maxLength={1000} value={form.negativeTags || ''} onChange={e => update('negativeTags', e.target.value)} /></label>{form.action === 'extend' && <label className="st-check"><input type="checkbox" checked={!!form.instrumental} onChange={e => update('instrumental', e.target.checked)} />Prolongement instrumental</label>}</div></details>}
        <footer className="st-submit">{!capability?.enabled ? <p className="st-notice">{p.demo ? 'Aperçu local · aucun appel fournisseur.' : capability?.unavailableReason === 'pricing_review' ? 'Coût fournisseur en vérification. Cet outil reste indisponible : aucun crédit débité.' : capability?.unavailableReason === 'not_enabled' ? 'Tarif fixé · ouverture de cet outil à venir. Aucun crédit débité.' : 'Cet outil est temporairement indisponible. Aucun crédit débité.'}</p> : <><p className="st-muted">{confirm ? `Confirmer · ${studioCreditsLabel(capability.credits!)} pour cette demande ?` : `${studioCreditsLabel(capability.credits!)} par demande · tous les résultats inclus`}</p><p className="st-muted">{form.action === 'midi' ? 'La séparation préalable est une opération distincte, avec son propre coût. ' : ''}Une nouvelle demande est facturée à nouveau. Un échec confirmé restitue les crédits ; un statut incertain reste à vérifier.</p><div className="st-confirm-actions">{confirm && <button className="us-secondary" disabled={busy} onClick={() => setConfirm(false)}>Annuler</button>}<button className="us-generate" onClick={submit} disabled={busy}>{busy ? <Loader2 className="us-spin" size={17} /> : <Sparkles size={17} />}{busy ? 'Envoi…' : confirm ? 'Confirmer et lancer' : `Continuer · ${studioCreditsLabel(capability.credits!)}`}</button></div></>}</footer>
      </div>}
      {screen === 'jobs' && <div className="st-jobs"><button className="us-text-button" disabled={loading} onClick={() => void p.tasks.refresh()}><RefreshCw size={14} />Actualiser</button>{!visibleJobs.length && !loading && <div className="us-empty"><Clock size={28} /><h3>Vos prochaines versions, ici.</h3><p>Retrouvez les résultats et les exports sans relancer de génération.</p><button className="us-secondary" onClick={() => setScreen('tools')}>Explorer les outils</button></div>}{visibleJobs.map(job => <article key={job.id} className="st-job"><header><div><small>{STUDIO_TOOLS.find(item => item.id === job.action)?.label}</small><h3>{job.title}</h3></div><span className="st-job-state" data-state={job.status}>{job.status === 'completed' ? <Check size={14} /> : ['pending', 'submitting'].includes(job.status) ? <Loader2 size={14} className="us-spin" /> : null}{labels[job.status]}</span></header><p className="st-muted">{new Date(job.createdAt).toLocaleString('fr-FR')} · {job.credits} crédits{job.refunded ? ' restitués' : ''}</p>{job.message && <p role="status" className="st-notice">{job.message}</p>}{job.result.warning && <p className="st-notice">{job.result.warning}</p>}{job.result.text && <><p className="st-result-text">{job.result.text}</p>{job.action === 'style' && <button className="us-secondary" onClick={() => { p.applyStyle(job.result.text!); setNotice('Direction musicale reportée dans votre espace de création.'); }}>Utiliser ce style <ArrowUpRight size={15} /></button>}</>}{job.result.assets.some(asset => asset.trackId) && <button className="us-secondary" onClick={() => p.onResult?.(job.result.assets.find(asset => asset.trackId)!.trackId!)}>Retrouver dans mes morceaux <ArrowUpRight size={15}/></button>}{job.result.assets.map((asset, index) => <div key={`${asset.url}-${index}`} className="st-asset">{asset.kind === 'image' && <img src={asset.url} alt={asset.label} loading="lazy" />}<span>{asset.label}</span>{asset.kind === 'audio' && <button className="us-icon" aria-label={`Écouter ${asset.label}`} onClick={() => p.play({ id: asset.trackId || `studio-${job.id}-${index}`, title: asset.label, audioUrl: asset.url, duration: asset.duration || 0, createdAt: job.createdAt, style: '', lyrics: '', prompt: '', isInstrumental: false, imageUrl: asset.imageUrl })}><Play size={16} /></button>}<a className="us-icon" href={asset.url} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir le fichier ${asset.label}`}><Download size={16} /></a></div>)}{job.result.midi && <button className="us-secondary" onClick={() => { const bytes = encodeStudioMidi(job.result.midi!); const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/midi' })); const link = document.createElement('a'); link.href = url; link.download = `synaura-${job.id}.mid`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }}><Download size={16} />Télécharger le MIDI</button>}</article>)}</div>}
    </section>;
  return p.embedded ? <div className="st-inline" hidden={!p.open}>{content}</div> : <SynauraOverlay open={p.open} onClose={p.onClose} ariaLabel="Atelier de création" presentation="responsive" size="lg" className="studio-tools-overlay">{content}</SynauraOverlay>;
}
