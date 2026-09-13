'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Clock3,
  Command,
  Coins,
  History,
  Library,
  ListMusic,
  Loader2,
  Play,
  Search,
  Settings,
  Sparkles,
  Terminal,
  Wand2,
  X,
} from 'lucide-react';
import Link from '@/components/navigation/HandoffLink';
import HandoffReturn from '@/components/navigation/HandoffReturn';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { useAudioPlayer } from '@/app/providers';
import { useAIQuota } from '@/hooks/useAIQuota';
import { useStudioStore } from '@/lib/studio/store';
import LeftDock from '@/components/studio/LeftDock/LeftDock';
import StudioTimeline from '@/components/studio/Center/StudioTimeline';
import Inspector from '@/components/studio/RightDock/Inspector';
import { useStudioLibrary } from '@/components/studio/hooks/useStudioLibrary';
import { useStudioHotkeys } from '@/components/studio/hooks/useStudioHotkeys';
import { useStudioGenerationQueue } from '@/components/studio/hooks/useStudioGenerationQueue';
import MobileTabs from '@/components/studio/ui/MobileTabs';
import DrawerInspector from '@/components/studio/ui/DrawerInspector';
import { DEFAULT_SUNO_MODEL, normalizeGenerationModel } from '@/lib/sunoModels';

type LogLine = {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error' | 'ok';
  msg: string;
};

type StudioPreset = {
  id: string;
  name: string;
  desc: string;
  patch: Partial<ReturnType<typeof useStudioStore.getState>['form']>;
};

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function StudioClient() {
  const { audioState, play, pause, nextTrack, previousTrack, playTrack, setQueueAndPlay } = useAudioPlayer();
  const { quota } = useAIQuota();
  const searchParams = useSearchParams();

  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shellMode, setShellMode] = useState<'ide' | 'classic'>('ide');
  const [leftExplorerTab, setLeftExplorerTab] = useState<'builder' | 'presets' | 'assets' | 'history'>('builder');
  const [assetQuery, setAssetQuery] = useState('');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const cmdInputRef = useRef<HTMLInputElement | null>(null);

  const setUI = useStudioStore((s) => s.setUI);
  const ui = useStudioStore((s) => s.ui);
  const setForm = useStudioStore((s) => s.setForm);
  const form = useStudioStore((s) => s.form);
  const jobs = useStudioStore((s) => s.jobs);
  const queueItems = useStudioStore((s) => s.queueItems);
  const selectTrack = useStudioStore((s) => s.selectTrack);
  const loadTrackIntoForm = useStudioStore((s) => s.loadTrackIntoForm);
  const runningJobsCount = useStudioStore((s) => (s.queueItems || []).filter((q) => q.status === 'running').length);

  const { creditsBalance, setCreditsBalance, libraryLoading, libraryError, loadLibraryTracks, visibleTracks } =
    useStudioLibrary();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('studio.shell.mode');
      if (raw === 'classic' || raw === 'ide') setShellMode(raw);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('studio.shell.mode', shellMode);
    } catch {}
  }, [shellMode]);

  const presets = useMemo<StudioPreset[]>(
    () => [
      {
        id: 'edm',
        name: 'EDM Banger',
        desc: 'Drop puissant, lead large, festival energy.',
        patch: { customMode: false, model: DEFAULT_SUNO_MODEL, instrumental: true, duration: null, description: 'EDM énergique, drop puissant, lead large, festival vibe', tags: ['edm', 'drop', 'festival'] },
      },
      {
        id: 'rapfr',
        name: 'Rap FR Mélodique',
        desc: '808 propre, topline mélodique, ambiance nocturne.',
        patch: { customMode: false, model: DEFAULT_SUNO_MODEL, instrumental: false, duration: null, description: 'rap fr mélodique, 808 propre, topline catchy, ambiance nuit', tags: ['rap', 'fr', 'melodique'] },
      },
      {
        id: 'lofichill',
        name: 'Lo-fi Chill',
        desc: 'Warm keys, texture vinyle, drums doux.',
        patch: { customMode: false, model: DEFAULT_SUNO_MODEL, instrumental: true, duration: null, description: 'lofi chill, warm keys, texture vinyle, batterie douce', tags: ['lofi', 'chill', 'warm'] },
      },
      {
        id: 'cinematic',
        name: 'Cinematic',
        desc: 'Build orchestral, impact trailer.',
        patch: { customMode: true, model: DEFAULT_SUNO_MODEL, instrumental: true, duration: 120, lyrics: '', style: 'cinematic orchestral epic trailer', title: 'Cinematic Build', tags: ['cinematic', 'orchestral', 'epic'] },
      },
      {
        id: 'v6pop',
        name: 'Pop V6',
        desc: 'Voix claires, arrangement pop et mix détaillé.',
        patch: { customMode: false, model: DEFAULT_SUNO_MODEL, instrumental: false, duration: null, description: 'pop, clean vocals, detailed mix, modern radio energy', tags: ['pop', 'clean'] },
      },
    ],
    []
  );

  const historyRows = useMemo(() => {
    const jobRows = (jobs || []).map((j) => ({
      id: `job_${j.id}`,
      kind: 'job',
      at: j.createdAt || '',
      status: j.status,
      label: j.paramsSnapshot?.title || j.paramsSnapshot?.prompt || `Job ${j.id}`,
    }));
    const queueRows = (queueItems || []).map((q) => ({
      id: `queue_${q.id}`,
      kind: 'queue',
      at: q.createdAt || '',
      status: q.status,
      label: q.paramsSnapshot?.title || q.paramsSnapshot?.prompt || `Queue ${q.id}`,
    }));
    return [...jobRows, ...queueRows]
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 30);
  }, [jobs, queueItems]);

  const filteredAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    if (!q) return visibleTracks;
    return visibleTracks.filter((t) => {
      const hay = `${t.title} ${(t.tags || []).join(' ')} ${t.prompt || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [assetQuery, visibleTracks]);

  useEffect(() => {
    const sharedTrackId = searchParams?.get('track');
    if (!sharedTrackId || visibleTracks.length === 0) return;
    const exists = visibleTracks.some((t) => t.id === sharedTrackId);
    if (!exists) return;
    selectTrack(sharedTrackId);
    setUI({ inspectorOpen: true, mobileTab: 'inspector' });
  }, [searchParams, selectTrack, setUI, visibleTracks]);

  const pushLog = useCallback((level: LogLine['level'], msg: string) => {
    const now = new Date();
    const ts = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [{ id: makeId(), ts, level, msg }, ...prev].slice(0, 60));
  }, []);

  useEffect(() => {
    if (jobs.length === 0) return;
    const latest = jobs[0];
    if (latest.status === 'failed') pushLog('error', `Job échoué: ${latest.id}`);
    if (latest.status === 'done') pushLog('ok', `Job terminé: ${latest.id}`);
  }, [jobs, pushLog]);

  useStudioHotkeys({
    isPlaying: audioState.isPlaying,
    onPlay: () => void play(),
    onPause: () => pause(),
    onPrev: () => previousTrack(),
    onNext: () => nextTrack(),
    onFocusSearch: () => searchRef.current?.focus(),
    onCloseInspector: () => setUI({ inspectorOpen: false }),
  });

  const { enqueueFromCurrentForm, generateVariantFromTrack, bgGenerations } = useStudioGenerationQueue({
    onInsufficientCredits: () => setShowBuyCredits(true),
    onCreditsBalance: (b) => setCreditsBalance(b),
  });

  const runGenerate = useCallback(() => {
    const requestedVariants = Math.max(2, Math.min(8, Number(form.variations || 2)));
    const batchCount = Math.max(1, Math.ceil(requestedVariants / 2));
    if (enqueueFromCurrentForm()) pushLog('info', `${batchCount} génération(s) en file (${form.model})`);
  }, [enqueueFromCurrentForm, form.model, form.variations, pushLog]);

  const applyPreset = useCallback(
    (p: StudioPreset) => {
      setForm({ negativeTags: '', vocalGender: '', styleInfluence: 50, weirdness: 50, audioWeight: 50, ...p.patch, tags: [...(p.patch.tags || [])] });
      pushLog('ok', `Preset appliqué: ${p.name}`);
      setLeftExplorerTab('builder');
    },
    [setForm, pushLog]
  );

  const playTrackCompat = useCallback(
    async (trackId: string) => {
      const found = visibleTracks.find((x) => x.id === trackId);
      if (!found) return;
      const queue = visibleTracks
        .filter((track) => track.audioUrl)
        .map((track) => ({
          _id: `ai-${track.id}`,
          title: track.title,
          artist: { _id: 'ai', name: track.artistName, username: track.artistName },
          duration: track.durationSec || 120,
          audioUrl: track.audioUrl || '',
          coverUrl: track.coverUrl || '/brand/2026/synaura-symbol-2026-white.png',
          genre: ['IA', 'Genere'],
          plays: 0,
          likes: [],
          comments: [],
          lyrics: (track.lyrics || track.prompt || '').trim(),
          source: 'studio',
        }));
      const startIndex = Math.max(0, queue.findIndex((track) => track._id === `ai-${found.id}`));
      try {
        if (queue.length > 0) setQueueAndPlay(queue as any, startIndex);
        else await playTrack({
          _id: `ai-${found.id}`,
          title: found.title,
          artist: { _id: 'ai', name: found.artistName, username: found.artistName },
          duration: found.durationSec || 120,
          audioUrl: found.audioUrl || '',
          coverUrl: found.coverUrl || '/brand/2026/synaura-symbol-2026-white.png',
          genre: ['IA', 'Genere'],
          plays: 0,
          likes: [],
          comments: [],
          lyrics: (found.lyrics || found.prompt || '').trim(),
          source: 'studio',
        } as any);
        pushLog('info', `Lecture: ${found.title}`);
      } catch (e: any) {
        pushLog('error', e?.message || 'Erreur lecture');
      }
    },
    [playTrack, pushLog, setQueueAndPlay, visibleTracks]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setCmdOpen(false);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
        setTimeout(() => cmdInputRef.current?.focus(), 0);
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const mobileTab = ui.mobileTab || 'library';

  return (
    <div className="v2-creation v2-studio chambre-signature-studio experience-creation experience-studio studio-pro relative h-[100svh] overflow-hidden text-white">

      <div className="relative z-10 flex flex-col h-full">
        {/* IDE toolbar shell */}
        <header className="v2-studio-toolbar chambre-workspace-toolbar chambre-signature-studio-toolbar sticky top-0 z-30">
          <HandoffReturn />
          <div className="experience-studio-controls h-14 px-3 flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="chambre-studio-insignia h-9 w-9 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="v2-kicker">L’atelier / IDE</div>
                <h1 className="text-base font-normal">Studio IDE<span className="chambre-signature-tool-dot" aria-hidden="true">.</span></h1>
              </div>
              <Link href="/ai-generator" className="hidden xl:inline-flex min-h-10 items-center border-l border-[var(--v2-line)] pl-4 ml-3 text-xs text-[var(--v2-muted)]">AI Generator</Link>
            </div>

            <div className="h-6 w-px bg-border-secondary mx-1 hidden md:block" />

            <div className="ml-auto hidden min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-[var(--v2-raised)] px-3 py-2 md:flex">
              <div className={`h-1.5 w-1.5 rounded-full ${audioState.isPlaying ? 'bg-[var(--v2-accent)]' : 'bg-[var(--v2-muted)]'}`} />
              <span className="max-w-[220px] truncate text-xs font-semibold text-white/70">
                {currentTrack?.title ? `En écoute : ${(currentTrack as any).title}` : 'Lecteur Synaura prêt'}
              </span>
            </div>

            <div className="hidden lg:flex w-[300px] items-center gap-2 rounded-2xl border border-border-secondary bg-[var(--v2-raised)] px-3 py-2">
              <Search className="h-4 w-4 text-foreground-tertiary" />
              <input
                ref={searchRef}
                value={ui.search}
                onChange={(e) => setUI({ search: e.target.value })}
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--v2-muted)]"
                placeholder="Rechercher dans la bibliothèque…"
              />
              <button
                onClick={() => setCmdOpen(true)}
                className="rounded-lg bg-[var(--v2-raised)] px-2 py-1 text-[11px] font-semibold text-white/70 hover:bg-[var(--v2-raised)] inline-flex items-center gap-1"
              >
                <Command className="h-3 w-3" /> K
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 rounded-2xl border border-border-secondary bg-[var(--v2-raised)] px-3 py-2">
              <Coins className="w-4 h-4 text-foreground-tertiary" />
              <span className="text-xs text-foreground-tertiary">Crédits</span>
              <span className="text-sm font-semibold">{creditsBalance}</span>
            </div>

            <button
              onClick={runGenerate}
              className="hidden md:inline-flex items-center gap-2 rounded-lg bg-[var(--v2-text)] px-4 py-2 text-sm font-semibold text-[var(--v2-bg)] hover:opacity-90"
            >
              <Wand2 className="h-4 w-4" />
              Générer
            </button>

            <button onClick={() => setShowBuyCredits(true)} className="rounded-lg p-2 text-white/70 hover:bg-[var(--v2-raised)]" title="Acheter des crédits" aria-label="Acheter des crédits">
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl p-2 text-white/70 hover:bg-[var(--v2-raised)] hover:text-white"
              title="Paramètres"
              aria-label="Paramètres"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className="experience-studio-mode hidden md:flex items-center gap-1 rounded-xl border border-border-secondary bg-[var(--v2-raised)] p-1" role="group" aria-label="Densité du studio">
              <button
                onClick={() => setShellMode('classic')}
                aria-pressed={shellMode === 'classic'}
                className={`px-2 py-1 text-xs rounded-lg ${shellMode === 'classic' ? 'bg-[var(--v2-raised)] text-[var(--v2-text)]' : 'text-white/70 hover:bg-[var(--v2-raised)]'}`}
              >
                Simple
              </button>
              <button
                onClick={() => setShellMode('ide')}
                aria-pressed={shellMode === 'ide'}
                className={`px-2 py-1 text-xs rounded-lg ${shellMode === 'ide' ? 'bg-[var(--v2-raised)] text-[var(--v2-text)]' : 'text-white/70 hover:bg-[var(--v2-raised)]'}`}
              >
                Complet
              </button>
            </div>
            <span className="md:hidden text-[10px] text-foreground-tertiary px-2 py-1 rounded-lg border border-border-secondary bg-[var(--v2-raised)]">
              {shellMode.toUpperCase()}
            </span>
          </div>
        </header>

        <div className="experience-studio-workspace flex-1 min-h-0 px-3 pb-3">
          <div className="v2-studio-canvas">
            <div className="experience-studio-intent col-span-12 lg:col-span-3 min-h-0">
              <div className={mobileTab === 'generate' ? 'block h-full' : 'hidden lg:block h-full'}>
                {shellMode === 'classic' ? (
                  <LeftDock onGenerate={enqueueFromCurrentForm} />
                ) : (
                  <div className="panel-suno v2-studio-workbench h-full min-h-0 flex flex-col overflow-hidden">
                    <div className="experience-studio-editor-heading p-3 border-b border-border-secondary">
                      <div className="v2-kicker">01 · Construire</div>
                      <h2 className="mt-2 text-lg font-normal text-foreground-primary">Le point de départ.</h2>
                      <div className="experience-studio-editor-tabs mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Outils de préparation">
                        <button
                          onClick={() => setLeftExplorerTab('builder')}
                          aria-pressed={leftExplorerTab === 'builder'}
                          className={`h-8 rounded-xl text-xs ${leftExplorerTab === 'builder' ? 'bg-[var(--v2-raised)] text-[var(--v2-text)]' : 'bg-[var(--v2-raised)] text-white/80 hover:bg-[var(--v2-raised)]'}`}
                        >
                          Intention
                        </button>
                        <button
                          onClick={() => setLeftExplorerTab('presets')}
                          aria-pressed={leftExplorerTab === 'presets'}
                          className={`h-8 rounded-xl text-xs ${leftExplorerTab === 'presets' ? 'bg-[var(--v2-raised)] text-[var(--v2-text)]' : 'bg-[var(--v2-raised)] text-white/80 hover:bg-[var(--v2-raised)]'}`}
                        >
                          Préréglages
                        </button>
                        <button
                          onClick={() => setLeftExplorerTab('assets')}
                          aria-pressed={leftExplorerTab === 'assets'}
                          className={`h-8 rounded-xl text-xs ${leftExplorerTab === 'assets' ? 'bg-[var(--v2-raised)] text-[var(--v2-text)]' : 'bg-[var(--v2-raised)] text-white/80 hover:bg-[var(--v2-raised)]'}`}
                        >
                          Sources
                        </button>
                        <button
                          onClick={() => setLeftExplorerTab('history')}
                          aria-pressed={leftExplorerTab === 'history'}
                          className={`h-8 rounded-xl text-xs ${leftExplorerTab === 'history' ? 'bg-[var(--v2-raised)] text-[var(--v2-text)]' : 'bg-[var(--v2-raised)] text-white/80 hover:bg-[var(--v2-raised)]'}`}
                        >
                          Historique
                        </button>
                      </div>
                    </div>

                    <div className="experience-studio-editor-scroll min-h-0 overflow-y-auto p-3 space-y-3">
                      {leftExplorerTab === 'builder' && <LeftDock onGenerate={enqueueFromCurrentForm} />}

                      {leftExplorerTab === 'presets' && (
                        <div className="space-y-2">
                          {presets.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => applyPreset(p)}
                              className="w-full rounded-2xl border border-border-secondary bg-[var(--v2-raised)] p-3 text-left hover:bg-[var(--v2-raised)]"
                            >
                              <div className="text-sm font-semibold">{p.name}</div>
                              <div className="text-xs text-foreground-tertiary mt-1">{p.desc}</div>
                            </button>
                          ))}
                        </div>
                      )}

                      {leftExplorerTab === 'assets' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-foreground-tertiary inline-flex items-center gap-2">
                              <Library className="w-4 h-4" /> Références
                            </div>
                            <button
                              onClick={() => loadLibraryTracks()}
                              className="h-7 px-2 rounded-lg text-[11px] bg-[var(--v2-raised)] hover:bg-[var(--v2-raised)]"
                            >
                              Actualiser
                            </button>
                          </div>
                          <input
                            value={assetQuery}
                            onChange={(e) => setAssetQuery(e.target.value)}
                            className="w-full h-8 rounded-xl border border-border-secondary bg-[var(--v2-raised)] px-2 text-xs outline-none focus:border-white/20"
                            placeholder="Rechercher une source…"
                          />
                          {libraryLoading ? (
                            <div className="text-xs text-foreground-tertiary">Chargement des sources…</div>
                          ) : null}
                          {libraryError ? (
                            <div className="text-xs text-red-300">{libraryError}</div>
                          ) : null}
                          {filteredAssets.slice(0, 24).map((t) => (
                            <div key={t.id} className="rounded-xl border border-border-secondary bg-[var(--v2-raised)] p-2">
                              <div className="text-xs font-semibold truncate">{t.title}</div>
                              <div className="text-[11px] text-foreground-tertiary truncate">{(t.tags || []).slice(0, 3).join(', ') || 'Aucun tag'}</div>
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => {
                                    selectTrack(t.id);
                                    loadTrackIntoForm(t.id);
                                    setUI({ inspectorOpen: true, mobileTab: 'inspector' });
                                    pushLog('info', `Track chargé dans le form: ${t.title}`);
                                  }}
                                  className="h-7 px-2 rounded-lg text-[11px] bg-[var(--v2-raised)] hover:bg-[var(--v2-raised)]"
                                >
                                  Utiliser
                                </button>
                                <button
                                  onClick={() => void playTrackCompat(t.id)}
                                  className="h-7 px-2 rounded-lg text-[11px] bg-[var(--v2-raised)] hover:bg-[var(--v2-raised)] inline-flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" /> Écouter
                                </button>
                              </div>
                            </div>
                          ))}
                          {filteredAssets.length === 0 ? (
                            <div className="experience-small-empty"><Library size={24} aria-hidden="true" /><strong>{assetQuery ? 'Aucune source correspondante.' : 'Tes références se retrouvent ici.'}</strong><p>{assetQuery ? 'Essaie un autre titre ou un autre tag.' : 'Tes créations peuvent devenir le point de départ d’une nouvelle version.'}</p></div>
                          ) : null}
                        </div>
                      )}

                      {leftExplorerTab === 'history' && (
                        <div className="space-y-2">
                          <div className="text-xs text-foreground-tertiary inline-flex items-center gap-2">
                              <History className="w-4 h-4" /> Générations et file d’attente
                          </div>
                          {historyRows.map((row) => (
                            <div key={row.id} className="rounded-xl border border-border-secondary bg-[var(--v2-raised)] p-2">
                              <div className="text-xs font-semibold truncate">{row.label}</div>
                              <div className="text-[11px] text-foreground-tertiary inline-flex items-center gap-2 mt-1">
                                <Clock3 className="w-3 h-3" />
                                <span>{row.kind}</span>
                                <span>• {row.status}</span>
                              </div>
                            </div>
                          ))}
                          {historyRows.length === 0 ? (
                            <div className="experience-small-empty"><History size={24} aria-hidden="true" /><strong>La session est ouverte.</strong><p>Les générations et leur progression apparaîtront ici après ton premier lancement.</p></div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="v2-studio-results min-h-0">
              <div className={mobileTab === 'timeline' || mobileTab === 'library' ? 'block' : 'hidden lg:block'}>
                <header className="experience-session-strip" data-generation-state={runningJobsCount > 0 ? 'pending' : 'idle'}>
                  <div className="experience-session-signal" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
                  <div><p className="v2-kicker">02 / L’espace d’écoute</p><h2>{runningJobsCount > 0 ? 'Les idées prennent forme.' : 'Trouve la bonne version.'}</h2></div>
                  <span className="experience-session-count">{visibleTracks.length}<small>piste{visibleTracks.length > 1 ? 's' : ''}</small></span>
                </header>
                <StudioTimeline
                  tracks={visibleTracks}
                  loading={libraryLoading}
                  error={libraryError}
                  bgGenerations={bgGenerations}
                  onRefreshLibrary={loadLibraryTracks}
                  searchRef={searchRef}
                />
              </div>
            </div>

            <div className="experience-studio-inspect col-span-12 lg:col-span-3 min-h-0">
              <div className="hidden lg:block h-full">
                <Inspector onGenerateVariantFromTrack={generateVariantFromTrack} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom console */}
        <footer className="chambre-signature-studio-console experience-studio-console border-t border-[var(--v2-line)] bg-[var(--v2-bg)]">
          <div className="px-3 py-2 grid grid-cols-12 gap-2">
            <div className="col-span-12 lg:col-span-8">
              <div className="text-xs text-foreground-tertiary inline-flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Console
              </div>
              <div className="mt-1 max-h-[74px] overflow-y-auto space-y-1 pr-1">
                {logs.length === 0 ? (
                  <div className="text-xs text-foreground-tertiary">Studio prêt. Lance une génération pour voir les événements.</div>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 text-xs">
                      <span className="w-[66px] text-foreground-tertiary">{l.ts}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          l.level === 'info'
                            ? 'bg-[var(--v2-raised)] text-white/70'
                            : l.level === 'warn'
                            ? 'bg-yellow-400/15 text-yellow-200'
                            : l.level === 'error'
                            ? 'bg-red-500/15 text-red-200'
                            : 'bg-emerald-400/15 text-emerald-200'
                        }`}
                      >
                        {l.level.toUpperCase()}
                      </span>
                      <span className="text-foreground-secondary truncate">{l.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 text-xs text-foreground-tertiary flex items-center justify-between">
              <span>{(currentTrack as any)?.title ? `Lecture: ${(currentTrack as any).title}` : 'Aucune lecture'}</span>
              <span className="inline-flex items-center gap-2">
                {runningJobsCount > 0 ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {runningJobsCount} génération(s) en cours • quota {quota?.remaining ?? '—'}
              </span>
            </div>
          </div>
        </footer>
      </div>

      <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />
      <MobileTabs />

      <DrawerInspector
        isOpen={mobileTab === 'inspector'}
        title="Inspecteur"
        onClose={() => setUI({ mobileTab: 'library' })}
      >
        <div className="h-[64svh] overflow-hidden">
          <Inspector onGenerateVariantFromTrack={generateVariantFromTrack} />
        </div>
      </DrawerInspector>

      {/* Paramètres */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f14] shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Paramètres du studio"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-base font-semibold text-white">Paramètres</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-xl p-2 text-white/70 hover:bg-[var(--v2-raised)] hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs font-medium text-white/60 mb-2">Mode interface</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShellMode('classic')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium ${shellMode === 'classic' ? 'bg-[var(--v2-raised)] text-[var(--v2-text)]' : 'bg-[var(--v2-raised)] text-white/80 hover:bg-[var(--v2-raised)]'}`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setShellMode('ide')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium ${shellMode === 'ide' ? 'bg-[var(--v2-raised)] text-[var(--v2-text)]' : 'bg-[var(--v2-raised)] text-white/80 hover:bg-[var(--v2-raised)]'}`}
                  >
                    Complet
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--v2-muted)]">Simple : génération directe. Complet : sources, préréglages et historique autour du même projet.</p>
              </div>
              <div>
                <div className="text-xs font-medium text-white/60 mb-2">Raccourcis clavier</div>
                <ul className="text-xs text-white/70 space-y-1.5">
                  <li className="flex justify-between gap-4"><span>Palette de commandes</span><kbd className="rounded px-1.5 py-0.5 bg-[var(--v2-raised)] font-mono text-[10px]">Ctrl+K</kbd></li>
                  <li className="flex justify-between gap-4"><span>Lecture / Pause</span><kbd className="rounded px-1.5 py-0.5 bg-[var(--v2-raised)] font-mono text-[10px]">Espace</kbd></li>
                  <li className="flex justify-between gap-4"><span>Fermer (palette / modale)</span><kbd className="rounded px-1.5 py-0.5 bg-[var(--v2-raised)] font-mono text-[10px]">Échap</kbd></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Command palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label="Palette de commandes" className="w-full max-w-[720px] rounded-3xl border border-border-secondary bg-[#0b0b10] shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2 border-b border-border-secondary px-4 py-3">
              <Search className="h-4 w-4 text-foreground-tertiary" />
              <input
                ref={cmdInputRef}
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--v2-muted)]"
                placeholder="Commande… (generate, model v6, model v6 wild, model v6 mini)"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const val = (e.currentTarget.value || '').toLowerCase();
                  if (val.includes('generate')) runGenerate();
                  if (val.includes('preset')) applyPreset(presets[0]);
                  if (val.includes('mode ide')) setShellMode('ide');
                  if (val.includes('mode classic')) setShellMode('classic');
                  if (val.includes('mode')) pushLog('info', `Mode: ${val.includes('classic') ? 'classic' : 'ide'}`);
                  if (val.includes('model')) {
                    const model = val.includes('wild') ? 'V6_WILD' : val.includes('mini') ? 'V6_MINI' : DEFAULT_SUNO_MODEL;
                    setForm({ model: normalizeGenerationModel(model) });
                    pushLog('info', `Modèle demandé : ${model}. Accès vérifié au lancement.`);
                  }
                  if (val.includes('focus') || val.includes('search')) searchRef.current?.focus();
                  if (val.includes('inspector')) setUI({ mobileTab: 'inspector', inspectorOpen: true });
                  setCmdOpen(false);
                }}
              />
              <button onClick={() => setCmdOpen(false)} className="rounded-xl p-2 text-white/70 hover:bg-[var(--v2-raised)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 border-t border-border-secondary text-xs text-foreground-tertiary">
              <div className="space-y-1">
                <button onClick={() => { runGenerate(); setCmdOpen(false); }} className="w-full text-left hover:text-white inline-flex items-center gap-2"><Wand2 className="w-3 h-3" /> Generate</button>
                <button onClick={() => { applyPreset(presets[0]); setCmdOpen(false); }} className="w-full text-left hover:text-white inline-flex items-center gap-2"><ListMusic className="w-3 h-3" /> Apply preset (EDM)</button>
                <button onClick={() => { setShellMode(shellMode === 'ide' ? 'classic' : 'ide'); setCmdOpen(false); }} className="w-full text-left hover:text-white inline-flex items-center gap-2"><Settings className="w-3 h-3" /> Toggle mode ({shellMode})</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
