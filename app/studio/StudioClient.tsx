'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock3,
  Command,
  Coins,
  FolderOpen,
  History,
  Library,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Search,
  Settings,
  Sparkles,
  Square,
  Terminal,
  Wand2,
  X,
} from 'lucide-react';
import StudioBackground from '@/components/StudioBackground';
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
  const { audioState, play, pause, nextTrack, previousTrack, playTrack } = useAudioPlayer();
  const { quota } = useAIQuota();

  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('Mon projet');
  const [shellMode, setShellMode] = useState<'ide' | 'classic'>('ide');
  const [leftExplorerTab, setLeftExplorerTab] = useState<'builder' | 'presets' | 'assets' | 'history'>('builder');
  const [assetQuery, setAssetQuery] = useState('');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const cmdInputRef = useRef<HTMLInputElement | null>(null);

  const projects = useStudioStore((s) => s.projects);
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const renameProject = useStudioStore((s) => s.renameProject);
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

  const activeProject = useMemo(
    () => (projects || []).find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  useEffect(() => {
    setProjectNameInput(activeProject?.name || 'Mon projet');
  }, [activeProject?.name]);

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
        patch: { customMode: false, model: 'V4_5PLUS', description: 'EDM énergique, drop puissant, lead large, festival vibe', tags: ['edm', 'drop', 'festival'] },
      },
      {
        id: 'rapfr',
        name: 'Rap FR Mélodique',
        desc: '808 propre, topline mélodique, ambiance nocturne.',
        patch: { customMode: false, model: 'V5', description: 'rap fr mélodique, 808 propre, topline catchy, ambiance nuit', tags: ['rap', 'fr', 'melodique'] },
      },
      {
        id: 'lofichill',
        name: 'Lo-fi Chill',
        desc: 'Warm keys, texture vinyle, drums doux.',
        patch: { customMode: false, model: 'V4_5', description: 'lofi chill, warm keys, texture vinyle, batterie douce', tags: ['lofi', 'chill', 'warm'] },
      },
      {
        id: 'cinematic',
        name: 'Cinematic',
        desc: 'Build orchestral, impact trailer.',
        patch: { customMode: true, model: 'V5', style: 'cinematic orchestral epic trailer', title: 'Cinematic Build', tags: ['cinematic', 'orchestral', 'epic'] },
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

  const { enqueueFromCurrentForm, generateVariantFromTrack } = useStudioGenerationQueue({
    onInsufficientCredits: () => setShowBuyCredits(true),
    onCreditsBalance: (b) => setCreditsBalance(b),
  });

  const runGenerate = useCallback(() => {
    enqueueFromCurrentForm();
    pushLog('info', `Génération lancée (${form.model}, variations: ${form.variations || 1})`);
  }, [enqueueFromCurrentForm, form.model, form.variations, pushLog]);

  const applyPreset = useCallback(
    (p: StudioPreset) => {
      const nextTags = Array.from(new Set([...(form.tags || []), ...((p.patch.tags as string[]) || [])])).slice(0, 20);
      setForm({ ...p.patch, tags: nextTags });
      pushLog('ok', `Preset appliqué: ${p.name}`);
      setLeftExplorerTab('builder');
    },
    [form.tags, setForm, pushLog]
  );

  const playTrackCompat = useCallback(
    async (trackId: string) => {
      const found = visibleTracks.find((x) => x.id === trackId);
      if (!found) return;
      const playerTrack: any = {
        _id: `ai-${found.id}`,
        title: found.title,
        artist: { _id: 'ai', name: found.artistName, username: found.artistName },
        duration: found.durationSec || 120,
        audioUrl: found.audioUrl || '',
        coverUrl: found.coverUrl || '/synaura_symbol.svg',
        genre: ['IA', 'Genere'],
        plays: 0,
        likes: [],
        comments: [],
        lyrics: (found.lyrics || found.prompt || '').trim(),
      };
      try {
        await playTrack(playerTrack);
        pushLog('info', `Lecture: ${found.title}`);
      } catch (e: any) {
        pushLog('error', e?.message || 'Erreur lecture');
      }
    },
    [playTrack, pushLog, visibleTracks]
  );

  const applyProjectRename = useCallback(() => {
    if (!activeProjectId) return;
    const next = projectNameInput.trim();
    if (!next) return;
    renameProject(activeProjectId, next);
  }, [activeProjectId, projectNameInput, renameProject]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
        setTimeout(() => cmdInputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') setCmdOpen(false);
      if (e.key === ' ' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (audioState.isPlaying) pause();
        else void play();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioState.isPlaying, pause, play]);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const mobileTab = ui.mobileTab || 'library';

  return (
    <div className="studio-pro relative h-[100svh] overflow-hidden bg-[#050505] text-white">
      <StudioBackground />

      <div className="relative z-10 flex flex-col h-full">
        {/* IDE toolbar shell */}
        <header className="sticky top-0 z-30 border-b border-border-secondary bg-black/50 backdrop-blur-xl">
          <div className="h-14 px-3 flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-white/10 border border-border-secondary flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-[10px] text-foreground-tertiary">SYNAURA</div>
                <div className="text-xs font-semibold">STUDIO IDE</div>
              </div>
            </div>

            <div className="h-6 w-px bg-border-secondary mx-1 hidden md:block" />

            <button className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white" title="Ouvrir projet">
              <FolderOpen className="h-4 w-4" />
            </button>
            <input
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onBlur={applyProjectRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyProjectRename();
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              className="min-w-[160px] max-w-[360px] w-full md:w-auto rounded-xl border border-border-secondary bg-white/[0.04] px-3 py-1.5 text-sm outline-none focus:border-white/20"
              placeholder="Nom du projet"
            />

            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => previousTrack()} className="rounded-xl p-2 text-white/70 hover:bg-white/10">
                <Play className="h-4 w-4 rotate-180" />
              </button>
              <button
                onClick={() => (audioState.isPlaying ? pause() : void play())}
                className="rounded-xl p-2 border border-border-secondary bg-white/10 hover:bg-white/15"
              >
                {audioState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-[1px]" />}
              </button>
              <button onClick={() => nextTrack()} className="rounded-xl p-2 text-white/70 hover:bg-white/10">
                <Play className="h-4 w-4" />
              </button>
              <button onClick={() => pause()} className="rounded-xl p-2 text-white/70 hover:bg-white/10">
                <Square className="h-4 w-4" />
              </button>
            </div>

            <div className="hidden lg:flex w-[300px] items-center gap-2 rounded-2xl border border-border-secondary bg-white/[0.04] px-3 py-2">
              <Search className="h-4 w-4 text-foreground-tertiary" />
              <input
                ref={searchRef}
                value={ui.search}
                onChange={(e) => setUI({ search: e.target.value })}
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
                placeholder="Rechercher dans la bibliothèque…"
              />
              <button
                onClick={() => setCmdOpen(true)}
                className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/15 inline-flex items-center gap-1"
              >
                <Command className="h-3 w-3" /> K
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 rounded-2xl border border-border-secondary bg-white/[0.04] px-3 py-2">
              <Coins className="w-4 h-4 text-foreground-tertiary" />
              <span className="text-xs text-foreground-tertiary">Crédits</span>
              <span className="text-sm font-semibold">{creditsBalance}</span>
            </div>

            <button
              onClick={runGenerate}
              className="hidden md:inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
            >
              <Wand2 className="h-4 w-4" />
              Générer
            </button>

            <button onClick={() => setShowBuyCredits(true)} className="rounded-xl p-2 text-white/70 hover:bg-white/10">
              <Sparkles className="h-4 w-4" />
            </button>
            <button className="rounded-xl p-2 text-white/70 hover:bg-white/10">
              <Settings className="h-4 w-4" />
            </button>
            <div className="hidden md:flex items-center gap-1 rounded-xl border border-border-secondary bg-white/[0.04] p-1">
              <button
                onClick={() => setShellMode('classic')}
                className={`px-2 py-1 text-xs rounded-lg ${shellMode === 'classic' ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10'}`}
              >
                Classic
              </button>
              <button
                onClick={() => setShellMode('ide')}
                className={`px-2 py-1 text-xs rounded-lg ${shellMode === 'ide' ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10'}`}
              >
                IDE
              </button>
            </div>
            <span className="md:hidden text-[10px] text-foreground-tertiary px-2 py-1 rounded-lg border border-border-secondary bg-white/[0.04]">
              {shellMode.toUpperCase()}
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 px-3 pb-3">
          <div className="h-full grid grid-cols-12 gap-3 pb-16 lg:pb-0">
            <div className="col-span-12 lg:col-span-3 min-h-0">
              <div className={mobileTab === 'generate' ? 'block h-full' : 'hidden lg:block h-full'}>
                {shellMode === 'classic' ? (
                  <LeftDock onGenerate={enqueueFromCurrentForm} />
                ) : (
                  <div className="panel-suno h-full min-h-0 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-border-secondary">
                      <div className="text-[11px] text-foreground-tertiary">EXPLORER</div>
                      <div className="text-sm font-semibold text-foreground-primary">IDE Tools</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setLeftExplorerTab('builder')}
                          className={`h-8 rounded-xl text-xs ${leftExplorerTab === 'builder' ? 'bg-white text-black' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                        >
                          Builder
                        </button>
                        <button
                          onClick={() => setLeftExplorerTab('presets')}
                          className={`h-8 rounded-xl text-xs ${leftExplorerTab === 'presets' ? 'bg-white text-black' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                        >
                          Presets
                        </button>
                        <button
                          onClick={() => setLeftExplorerTab('assets')}
                          className={`h-8 rounded-xl text-xs ${leftExplorerTab === 'assets' ? 'bg-white text-black' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                        >
                          Assets
                        </button>
                        <button
                          onClick={() => setLeftExplorerTab('history')}
                          className={`h-8 rounded-xl text-xs ${leftExplorerTab === 'history' ? 'bg-white text-black' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}
                        >
                          History
                        </button>
                      </div>
                    </div>

                    <div className="min-h-0 overflow-y-auto p-3 space-y-3">
                      {leftExplorerTab === 'builder' && <LeftDock onGenerate={enqueueFromCurrentForm} />}

                      {leftExplorerTab === 'presets' && (
                        <div className="space-y-2">
                          {presets.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => applyPreset(p)}
                              className="w-full rounded-2xl border border-border-secondary bg-white/5 p-3 text-left hover:bg-white/10"
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
                              className="h-7 px-2 rounded-lg text-[11px] bg-white/10 hover:bg-white/15"
                            >
                              Refresh
                            </button>
                          </div>
                          <input
                            value={assetQuery}
                            onChange={(e) => setAssetQuery(e.target.value)}
                            className="w-full h-8 rounded-xl border border-border-secondary bg-white/[0.04] px-2 text-xs outline-none focus:border-white/20"
                            placeholder="Filtrer assets..."
                          />
                          {libraryLoading ? (
                            <div className="text-xs text-foreground-tertiary">Chargement assets...</div>
                          ) : null}
                          {libraryError ? (
                            <div className="text-xs text-red-300">{libraryError}</div>
                          ) : null}
                          {filteredAssets.slice(0, 24).map((t) => (
                            <div key={t.id} className="rounded-xl border border-border-secondary bg-white/5 p-2">
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
                                  className="h-7 px-2 rounded-lg text-[11px] bg-white/10 hover:bg-white/15"
                                >
                                  Use
                                </button>
                                <button
                                  onClick={() => void playTrackCompat(t.id)}
                                  className="h-7 px-2 rounded-lg text-[11px] bg-white/10 hover:bg-white/15 inline-flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" /> Play
                                </button>
                              </div>
                            </div>
                          ))}
                          {filteredAssets.length === 0 ? (
                            <div className="text-xs text-foreground-tertiary">Aucun asset dans ce projet.</div>
                          ) : null}
                        </div>
                      )}

                      {leftExplorerTab === 'history' && (
                        <div className="space-y-2">
                          <div className="text-xs text-foreground-tertiary inline-flex items-center gap-2">
                            <History className="w-4 h-4" /> Jobs + Queue
                          </div>
                          {historyRows.map((row) => (
                            <div key={row.id} className="rounded-xl border border-border-secondary bg-white/5 p-2">
                              <div className="text-xs font-semibold truncate">{row.label}</div>
                              <div className="text-[11px] text-foreground-tertiary inline-flex items-center gap-2 mt-1">
                                <Clock3 className="w-3 h-3" />
                                <span>{row.kind}</span>
                                <span>• {row.status}</span>
                              </div>
                            </div>
                          ))}
                          {historyRows.length === 0 ? (
                            <div className="text-xs text-foreground-tertiary">Historique vide.</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-6 min-h-0">
              <div className={mobileTab === 'timeline' || mobileTab === 'library' ? 'block' : 'hidden lg:block'}>
                <StudioTimeline
                  tracks={visibleTracks}
                  loading={libraryLoading}
                  error={libraryError}
                  bgGenerations={[]}
                  onRefreshLibrary={loadLibraryTracks}
                  searchRef={searchRef}
                />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-3 min-h-0">
              <div className="hidden lg:block h-full">
                <Inspector onGenerateVariantFromTrack={generateVariantFromTrack} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom console */}
        <footer className="border-t border-border-secondary bg-black/50 backdrop-blur-xl">
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
                            ? 'bg-white/10 text-white/70'
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
                {runningJobsCount} job(s) • quota {quota?.remaining ?? '—'}
              </span>
            </div>
          </div>
        </footer>
      </div>

      <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />
      <MobileTabs />

      <DrawerInspector
        isOpen={mobileTab === 'inspector'}
        title="Inspector"
        onClose={() => setUI({ mobileTab: 'library' })}
      >
        <div className="h-[64svh] overflow-hidden">
          <Inspector onGenerateVariantFromTrack={generateVariantFromTrack} />
        </div>
      </DrawerInspector>

      {/* Command palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20 backdrop-blur-sm">
          <div className="w-full max-w-[720px] rounded-3xl border border-border-secondary bg-[#0b0b10] shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2 border-b border-border-secondary px-4 py-3">
              <Search className="h-4 w-4 text-foreground-tertiary" />
              <input
                ref={cmdInputRef}
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
                placeholder="Commande… (generate, model v5, focus search, inspector)"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const val = (e.currentTarget.value || '').toLowerCase();
                  if (val.includes('generate')) runGenerate();
                  if (val.includes('preset')) applyPreset(presets[0]);
                  if (val.includes('mode ide')) setShellMode('ide');
                  if (val.includes('mode classic')) setShellMode('classic');
                  if (val.includes('mode')) pushLog('info', `Mode: ${val.includes('classic') ? 'classic' : 'ide'}`);
                  if (val.includes('model v5')) setForm({ model: 'V5' });
                  if (val.includes('model v4.5+')) setForm({ model: 'V4_5PLUS' as any });
                  if (val.includes('model v4.5')) setForm({ model: 'V4_5' });
                  if (val.includes('focus') || val.includes('search')) searchRef.current?.focus();
                  if (val.includes('inspector')) setUI({ mobileTab: 'inspector', inspectorOpen: true });
                  setCmdOpen(false);
                }}
              />
              <button onClick={() => setCmdOpen(false)} className="rounded-xl p-2 text-white/70 hover:bg-white/10">
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

