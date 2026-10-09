'use client';
import ProductHint from '@/components/benefits/ProductHint';
import FennecMark from '@/components/celestial/FennecMark';
import StudioTools from './StudioTools';
import StudioLibrary from './StudioLibrary';
import { useStudioTasks } from './useStudioTasks';
import type { StudioTool } from '@/lib/studio/tools';
import type { WorkspaceSong } from '@/lib/studio/workspace';
import StudioComposer from './StudioComposer';
import StudioInspector from './StudioInspector';
import StudioTrackStyle from './StudioTrackStyle';
import StudioActivity from './StudioActivity';
import StudioPanelResize from './StudioPanelResize';
import { useStudioPanels } from './useStudioPanels';
import StudioSyncedLyrics, { type StudioLyricPlayback } from './StudioSyncedLyrics';
import type { StudioTrackEdit } from './StudioTrackEditor';
import { sameStudioTrack, uniqueStudioTracks } from '@/lib/studio/trackIdentity';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, Check, ChevronDown, Download, Library, Loader2, Lock, Play, Plus, RefreshCw, SlidersHorizontal, Sparkles, Wand2 } from 'lucide-react';
import Link from '@/components/navigation/HandoffLink';
import HandoffReturn from '@/components/navigation/HandoffReturn';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';
import { ACTION_COSTS } from '@/lib/billing/pricing';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import type { GeneratedTrack } from '@/lib/aiStudioTypes';
import './unified-studio.css';
import './studio-workspace.css';
import './studio-mobile.css';

type Mode = 'simple' | 'custom' | 'remix';
type Field<T> = { value: T; set: (value: T) => void };
export type StudioSong = WorkspaceSong;
export interface UnifiedStudioProps {
  owner?: string;
  refreshCredits?: () => void;
  authenticated: boolean;
  quotaLoading: boolean;
  credits: number;
  buyCredits: () => void;
  form: {
    mode: Field<Mode>; description: Field<string>; title: Field<string>; style: Field<string>; lyrics: Field<string>;
    instrumental: Field<boolean>; model: Field<string>; allowedModels: readonly string[];
    duration: Field<number>; weirdness: Field<number>; styleInfluence: Field<number>; audioWeight: Field<number>;
    variety?: Field<number>; durationAuto?: Field<boolean>; libraryFolder?: Field<string>;
    negativeTags: Field<string>; vocalGender: Field<string>;
    tags: string[]; clearTags: () => void;
    remixSource: ReactNode; remixReady: boolean; remixOptions: ReactNode; sourceCredit: ReactNode;
  };
  generation: { busy: boolean; pending: boolean; taskId?: string; progress: number; status: string; error: string | null; cooldown: number; submit: () => Promise<void>; lyricsBusy: boolean; generateLyrics: () => Promise<void> };
  library: { songs: StudioSong[]; loading: boolean; error: string | null; refresh: () => void; fresh: GeneratedTrack[] };
  selected: GeneratedTrack | null;
  lyricPlayback?: StudioLyricPlayback;
  editTrack?: (track: GeneratedTrack, edit: StudioTrackEdit) => Promise<void>;
  importAudio?: (file: File) => void;
  select: (track: GeneratedTrack) => void;
  actions: { play: (track: GeneratedTrack) => void; download: (track: GeneratedTrack) => void; share: (track: GeneratedTrack) => void; remix: (track: GeneratedTrack) => void; reuse: (track: GeneratedTrack) => void; copyLyrics: (track: GeneratedTrack) => void; like: (track: GeneratedTrack) => void; trash: (track: GeneratedTrack) => void; folder: (track: GeneratedTrack, folder: string | null) => void; video: (track: GeneratedTrack) => void; videoBusy: boolean; publish: () => Promise<void>; publishBusy: boolean; published: boolean; permissions: ReactNode; timedLyrics: ReactNode };
  modals: ReactNode;
  draftRecovery?: ReactNode;
  generationRecovery?: ReactNode;
  checkGeneration?: (taskId: string) => void;
  toolsDemo?: boolean;
}

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
// Kept under a contract test with the existing music-video route; no pricing change.
const MUSIC_VIDEO_CREDIT_COST = 100;

export default function UnifiedStudio(input: UnifiedStudioProps) {
  const songs = useMemo(() => uniqueStudioTracks(input.library.songs), [input.library.songs]);
  const selected = input.selected && (songs.find(song => sameStudioTrack(song.track, input.selected!))?.track || input.selected);
  const p = { ...input, selected, library: { ...input.library, songs, fresh: input.library.fresh.filter(track => !songs.some(song => sameStudioTrack(song.track, track))) } };
  const search = useSearchParams();
  const [view, setView] = useState<'create' | 'library'>(search?.get('mode') || search?.get('sourceTrack') ? 'create' : 'library');
  const [details, setDetails] = useState(false);
  const [confirm, setConfirm] = useState<'publish' | 'trash' | 'video' | null>(null);
  const [folder, setFolder] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsSource, setToolsSource] = useState<GeneratedTrack | null>(null);
  const [toolAction, setToolAction] = useState<StudioTool>();
  const [toolActivity, setToolActivity] = useState(false);
  const [launchKey, setLaunchKey] = useState(0);
  const [pendingResult, setPendingResult] = useState<string | null>(null);
  const [libraryReveal, setLibraryReveal] = useState(0);
  const [replaceIntent, setReplaceIntent] = useState<{ action: 'reuse' | 'remix'; track: GeneratedTrack } | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [sharePrivate, setSharePrivate] = useState(false);
  const panels = useStudioPanels(p.owner);
  const inspectorOpen = details && !!p.selected;
  const leftMax = Math.max(280, Math.min(560, panels.width - (inspectorOpen && panels.docked ? panels.right + 24 : 0) - 400));
  const leftWidth = Math.min(panels.sizes.left, leftMax);
  const refreshStudio = () => { p.library.refresh(); p.refreshCredits?.(); };
  const tasks = useStudioTasks(p.authenticated ? p.owner || 'demo' : '', !!p.toolsDemo, refreshStudio);
  const submitLock = useRef(false);
  const composerRef = useRef<HTMLElement>(null);
  const deepLink = useRef('');
  const form = p.form;
  const living = useLivingMotion();
  const selectedSong = p.library.songs.find(song => song.track.id === p.selected?.id);

  useEffect(() => { if (p.generation.error) setView('create'); }, [p.generation.error]);
  useEffect(() => { if (p.generation.pending) setView('library'); }, [p.generation.pending]);
  useEffect(() => {
    if (!pendingResult) return;
    const track = p.library.songs.find(song => song.track.id === pendingResult)?.track;
    if (track) { p.select(track); setView('library'); setLibraryReveal(value => value + 1); setPendingResult(null); }
  }, [pendingResult, p.library.songs, p.select]);

  useEffect(() => {
    const openPlayingSong = (event: Event) => {
      const id = (event as CustomEvent<{ trackId?: string }>).detail?.trackId;
      if (typeof id !== 'string') return;
      const candidates = [...p.library.songs.map(song => song.track), ...p.library.fresh];
      const track = candidates.find(song => [song.id, `gen-${song.id}`, `ai-${song.id}`].includes(id));
      if (!track) return;
      event.preventDefault();
      p.select(track);
      setDetails(true);
      setView('library');
    };
    window.addEventListener('synaura:open-studio-track', openPlayingSong);
    return () => window.removeEventListener('synaura:open-studio-track', openPlayingSong);
  }, [p.library.songs, p.library.fresh, p.select]);

  useEffect(() => {
    if (search?.get('view') === 'library') setView('library');
    const id = search?.get('track');
    if (!id || deepLink.current === id) return;
    const song = p.library.songs.find(item => item.track.id === id.replace(/^ai-/, ''));
    if (song) { deepLink.current = id; p.select(song.track); setDetails(true); setView('library'); }
  }, [search, p.library.songs, p.select]);

  const lacksCredits = p.credits < ACTION_COSTS.generation.credits;
  const stylePresent = !!form.style.value.trim() || form.tags.some(tag => tag.trim());
  const empty = form.mode.value === 'simple' ? !form.description.value.trim() : form.mode.value === 'remix' ? !stylePresent : !stylePresent && !(form.instrumental.value ? '' : form.lyrics.value.trim()) && !form.negativeTags.value.trim();
  const disabled = p.quotaLoading || p.generation.busy || p.generation.cooldown > 0 || empty || lacksCredits || (form.mode.value === 'remix' && !form.remixReady);
  const openDetails = (track: GeneratedTrack) => { p.select(track); setDetails(true); setConfirm(null); setSharePrivate(false); setFolder(p.library.songs.find(song => song.track.id === track.id)?.folder || ''); };
  const share = (track: GeneratedTrack) => {
    const saved = songs.find(song => sameStudioTrack(song.track, track));
    if (!saved?.published) { openDetails(saved?.track || track); setSharePrivate(true); return; }
    p.actions.share(saved.track);
  };
  const focusComposer = () => window.requestAnimationFrame(() => {
    const target = composerRef.current?.querySelector<HTMLElement>('.st-inline:not([hidden]) h2, .sw-composition-fields:not([hidden]) .us-mode button[aria-pressed="true"]');
    target?.focus({ preventScroll: true });
  });
  const openTool = (action: StudioTool | undefined, source: GeneratedTrack | null, activity = false) => {
    setToolsSource(source); setToolAction(action); setToolActivity(activity); setLaunchKey(key => key + 1);
    setToolsOpen(true); setDetails(false); setView('create');
    focusComposer();
  };
  const composeFrom = (action: 'reuse' | 'remix', track: GeneratedTrack, confirmed = false) => {
    if (!confirmed && [form.title.value, form.description.value, form.style.value, form.lyrics.value].some(value => value.trim())) { setReplaceIntent({ action, track }); return; }
    p.actions[action](track); setToolsOpen(false); setDetails(false); setView('create'); setReplaceIntent(null); focusComposer();
  };
  const create = async () => {
    if (submitLock.current || disabled) return;
    submitLock.current = true;
    try { await p.generation.submit(); } finally { submitLock.current = false; }
  };

  return <div ref={panels.root} className="unified-studio us-workbench sw-workflow" style={{ '--studio-left-width': `${leftWidth}px`, '--studio-right-width': `${panels.right}px` } as CSSProperties} data-studio-view={view} data-inspector={inspectorOpen ? '' : undefined} data-motion={living.enabled}>
    <header className="us-header">
      <div className="us-brand"><button className="sc-companion" aria-label="Demander de l’aide au fennec" data-fennec-host="" onClick={() => window.dispatchEvent(new CustomEvent('synaura:companion-open'))}><FennecMark/></button><strong>Studio</strong><span className="sc-header-note">Un espace pour vos idées.</span></div>
      <div className="us-header-actions">{p.authenticated && <StudioActivity owner={p.owner} checkGeneration={p.checkGeneration}/>}<HandoffReturn fallbackHref="/live" fallbackLabel="Retour Live" className="us-return" />{p.authenticated && <button className="us-credit" aria-label={`${p.credits} crédits, ajouter des crédits`} onClick={p.buyCredits}><span>{p.quotaLoading ? '…' : p.credits} <small>crédits</small></span><Plus size={15} aria-hidden="true" /></button>}</div>
    </header>
    {!p.authenticated ? <main className="us-signin"><div className="us-sculpture" aria-hidden="true"><i /><i /><i /></div><span className="us-eyebrow">SYNAURA STUDIO</span><h1>Le prochain son.<br /><em>Le vôtre.</em></h1><p>Une idée, des paroles ou un extrait. À vous de jouer.</p><Link className="us-generate" href={`/auth/signin?callbackUrl=${encodeURIComponent(`/studio${search?.toString() ? `?${search.toString()}` : ''}`)}`}>Ouvrir mon studio <ArrowUpRight size={18} /></Link></main> : <>
      <nav className="sc-mobile-tabs" aria-label="Vue du studio"><button aria-pressed={view === 'create'} aria-controls="studio-creation-drawer" onClick={() => setView('create')}><Sparkles size={17}/>Créer</button><button aria-pressed={view === 'library'} onClick={() => setView('library')}><Library size={17}/>Mes morceaux<span>{p.library.songs.filter(song => !song.trashed).length}</span></button></nav>
      <main className="us-workspace">
        <div className="us-composer-drawer" id="studio-creation-drawer" data-drop-active={dropActive || undefined} onDragOver={event => { if (event.dataTransfer.types.some(type => ['application/x-synaura-track', 'Files'].includes(type))) { event.preventDefault(); setDropActive(true); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropActive(false); }} onDrop={event => {
          event.preventDefault(); setDropActive(false);
          const id = event.dataTransfer.getData('application/x-synaura-track');
          const source = p.library.songs.find(song => song.track.id === id);
          if (source && !source.trashed) composeFrom('remix', source.track);
          else if (event.dataTransfer.files[0] && p.importAudio) { setToolsOpen(false); form.mode.set('remix'); p.importAudio(event.dataTransfer.files[0]); }
        }}><div className="us-drawer-inner"><section ref={composerRef} className="us-composer" aria-label="Créer un morceau">
          {dropActive && <div className="sw-drop-hint">Déposer pour reprendre cet audio</div>}
          <div className="us-composer-scroll">
          <div hidden={toolsOpen} className="sw-composition-fields">
          <StudioComposer studio={p} onTool={action => openTool(action, null)}/>
          <div className="sc-product-hint"><ProductHint placement="studio" compact enabled={view === 'create' && !details && !p.generation.busy && !p.quotaLoading} /></div>
          </div>
          <StudioTools open={toolsOpen} onClose={() => setToolsOpen(false)} embedded launchKey={launchKey} initialAction={toolAction} initialPrompt={form.style.value || form.description.value} activity={toolActivity} tasks={tasks} source={toolsSource} songs={p.library.songs} models={form.allowedModels} play={p.actions.play} refresh={refreshStudio} applyStyle={style => { form.style.set(style); form.mode.set('custom'); setView('create'); setToolsOpen(false); }} demo={p.toolsDemo} onResult={id => { setPendingResult(id); p.library.refresh(); }}/>
          </div>
          {!toolsOpen && <div className="us-commit">{p.generation.error && <p role="alert" className="us-error">{p.generation.error}</p>}{lacksCredits && !p.quotaLoading ? <button className="us-generate" onClick={p.buyCredits}>Ajouter des crédits <Plus size={18} /></button> : <button className="us-generate" onClick={create} disabled={disabled}>{p.generation.busy ? <Loader2 size={18} className="us-spin" /> : <Sparkles size={18} />}<span>{p.generation.busy ? 'Création en cours…' : p.generation.cooldown ? `Réessayer dans ${p.generation.cooldown}s` : 'Créer mon morceau'}</span><span className="us-cost">{ACTION_COSTS.generation.credits} cr.</span></button>}<span className="us-private"><Lock size={11} />Privé jusqu’à votre publication</span></div>}
        </section></div><StudioPanelResize side="left" value={leftWidth} min={280} max={leftMax} change={value => panels.set('left', value)} reset={() => panels.set('left', 350)}/></div>
        <StudioLibrary key={libraryReveal} studio={{ ...p, actions: { ...p.actions, share } }} tasks={tasks} onTool={openTool} onCompose={composeFrom} onInspect={openDetails} onActivity={() => openTool(undefined, null, true)}/>
      </main>
    </>}
    <StudioInspector open={inspectorOpen} onClose={() => { setDetails(false); setConfirm(null); }} title={p.selected?.title || 'Détails du morceau'} resize={<StudioPanelResize side="right" value={panels.right} min={260} max={panels.rightMax} change={value => panels.set('right', value)} reset={() => panels.set('right', 292)}/> }>
      {p.selected && <div className="unified-studio us-detail"><div className="us-detail-hero">{p.selected.imageUrl && <img src={p.selected.imageUrl} alt="" />}<div><span className="us-eyebrow">{p.actions.published ? 'PUBLIÉ' : 'PRIVÉ'}</span><h2>{p.selected.title}</h2><StudioTrackStyle key={p.selected.id} style={p.selected.style}/><button className="us-secondary" onClick={() => p.actions.play(p.selected!)} disabled={selectedSong?.trashed}><Play size={16} />Écouter · {time(p.selected.duration)}</button></div></div>
        <div className="us-detail-actions"><button onClick={() => { setDetails(false); composeFrom('reuse', p.selected!); }}><Wand2 />Réutiliser</button><button onClick={() => { setDetails(false); composeFrom('remix', p.selected!); }}><RefreshCw />Remixer</button><button onClick={() => p.actions.download(p.selected!)}><Download />Télécharger</button><button onClick={() => share(p.selected!)}><ArrowUpRight />Partager</button></div>
        {sharePrivate && <div className="sw-share-private" role="status"><strong>{selectedSong ? 'Ce morceau est privé' : 'Enregistrement en cours'}</strong><p>{selectedSong ? 'Publiez-le ci-dessous pour obtenir un lien accessible à tous. Vos autres versions resteront privées.' : 'Le partage sera disponible dès que la piste sera enregistrée.'}</p>{selectedSong?.published ? <button className="us-secondary" onClick={() => p.actions.share(p.selected!)}>Partager le morceau publié</button> : selectedSong && <button className="us-secondary" onClick={() => setConfirm('publish')}>Choisir de publier</button>}</div>}
        <button className="us-secondary" disabled={selectedSong?.trashed} onClick={() => { openTool(undefined, p.selected); }}><SlidersHorizontal size={16} />Transformer & exporter<ArrowUpRight size={15} /></button>
        <details className="us-advanced" open><summary>Paroles & détails<ChevronDown size={14} /></summary><div className="us-advanced-fields"><StudioSyncedLyrics key={p.selected.id} track={p.selected} owner={p.owner} playback={p.lyricPlayback} demo={p.toolsDemo}/>{p.selected.lyrics && <button className="us-text-button" onClick={() => p.actions.copyLyrics(p.selected!)}>Copier les paroles</button>}</div></details>
        <details className="us-advanced"><summary>Organisation & outils<ChevronDown size={14} /></summary><div className="us-advanced-fields"><label className="us-field">Dossier<input value={folder} onChange={e => setFolder(e.target.value)} placeholder="Nom du dossier" /></label><button className="us-secondary" onClick={() => p.actions.folder(p.selected!, folder.trim() || null)}><Check size={14} />Enregistrer le dossier</button><button className="us-secondary" disabled={p.actions.videoBusy || p.credits < MUSIC_VIDEO_CREDIT_COST} onClick={() => setConfirm('video')}>Vidéo de couverture · {MUSIC_VIDEO_CREDIT_COST} crédits</button><button className="us-secondary" onClick={() => setConfirm('trash')}>{selectedSong?.trashed ? 'Restaurer' : 'Mettre à la corbeille'}</button></div></details>
        <details className="us-advanced"><summary>Droits de remix<ChevronDown size={14} /></summary><div className="us-advanced-fields">{p.actions.permissions}</div></details>
        <button className="us-generate us-publish" disabled={p.actions.publishBusy || !selectedSong || selectedSong.trashed} onClick={() => setConfirm('publish')}>{p.actions.publishBusy ? 'Mise à jour…' : p.actions.published ? 'Rendre privé' : 'Publier sur Synaura'}<ArrowUpRight size={17} /></button>
        {confirm && <div className="us-confirm" role="group" aria-label="Confirmer l’action"><p>{confirm === 'publish' ? p.actions.published ? 'Retirer ce morceau du public ?' : 'Rendre ce morceau public, selon les droits de sa source ?' : confirm === 'trash' ? selectedSong?.trashed ? 'Restaurer cette génération et ses versions ?' : 'Mettre cette génération et ses versions à la corbeille ?' : `Créer une vidéo de couverture pour ${MUSIC_VIDEO_CREDIT_COST} crédits ?`}</p><div><button className="us-secondary" onClick={() => setConfirm(null)}>Annuler</button><button className="us-secondary" disabled={p.actions.publishBusy || p.actions.videoBusy} onClick={async () => { if (confirm === 'publish') await p.actions.publish(); else if (confirm === 'trash') { p.actions.trash(p.selected!); setDetails(false); } else p.actions.video(p.selected!); setConfirm(null); }}>Confirmer</button></div></div>}
      </div>}
    </StudioInspector>
    {p.modals}
    <SynauraOverlay open={!!replaceIntent} onClose={() => setReplaceIntent(null)} ariaLabel="Remplacer la composition en cours" size="sm"><div className="unified-studio us-detail"><h2>Reprendre ce morceau ?</h2><p className="st-muted">Le titre, le style et les paroles de votre brouillon seront remplacés par ceux de « {replaceIntent?.track.title} ». Vos morceaux enregistrés restent intacts.</p><div className="sw-confirm-buttons"><button className="us-secondary" onClick={() => setReplaceIntent(null)}>Garder mon brouillon</button><button className="us-generate" onClick={() => replaceIntent && composeFrom(replaceIntent.action, replaceIntent.track, true)}>Reprendre le morceau</button></div></div></SynauraOverlay>
  </div>;
}
