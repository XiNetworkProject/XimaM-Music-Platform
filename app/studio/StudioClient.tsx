'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import StudioBackground from '@/components/StudioBackground';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { useAudioPlayer } from '@/app/providers';
import { fetchCreditsBalance } from '@/lib/credits';
import { useAIQuota } from '@/hooks/useAIQuota';
import { useBackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import { useStudioStore } from '@/lib/studio/store';
import { aiTrackToStudioTrack } from '@/lib/studio/adapters';
import { handleStudioHotkeys } from '@/lib/studio/hotkeys';
import TransportBar from '@/components/studio/TransportBar';
import LeftDock from '@/components/studio/LeftDock/LeftDock';
import StudioTimeline from '@/components/studio/Center/StudioTimeline';
import Inspector from '@/components/studio/RightDock/Inspector';

type TracksApiResponse = { tracks?: any[] };

export default function StudioClient() {
  const { data: session } = useSession();
  const { audioState, play, pause, nextTrack, previousTrack } = useAudioPlayer();
  const { quota } = useAIQuota();
  const { generations: bgGenerations, activeGenerations, startBackgroundGeneration } = useBackgroundGeneration();

  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);

  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const setTracks = useStudioStore((s) => s.setTracks);
  const tracks = useStudioStore((s) => s.tracks);
  const taskProjectMap = useStudioStore((s) => s.taskProjectMap);
  const upsertJob = useStudioStore((s) => s.upsertJob);
  const updateJobStatus = useStudioStore((s) => s.updateJobStatus);
  const bindTaskToProject = useStudioStore((s) => s.bindTaskToProject);
  const queueItems = useStudioStore((s) => s.queueItems);
  const queueConfig = useStudioStore((s) => s.queueConfig);
  const enqueueQueueItem = useStudioStore((s) => s.enqueueQueueItem);
  const updateQueueItem = useStudioStore((s) => s.updateQueueItem);
  const ui = useStudioStore((s) => s.ui);
  const setUI = useStudioStore((s) => s.setUI);

  const artistName = useMemo(() => {
    const u: any = session?.user;
    return (u?.name || u?.username || u?.email || 'Artiste') as string;
  }, [session?.user]);

  const loadCredits = async () => {
    const data = await fetchCreditsBalance();
    setCreditsBalance(data?.balance ?? 0);
  };

  const loadLibraryTracks = async () => {
    if (!session?.user?.id) return;
    try {
      setLibraryLoading(true);
      setLibraryError(null);
      const q = (ui.search || '').trim();
      const url = `/api/ai/library/tracks?limit=200&offset=0&search=${encodeURIComponent(q)}`;
      const res = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
      const json = (await res.json()) as TracksApiResponse;
      if (!res.ok) throw new Error((json as any)?.error || 'Erreur chargement bibliothèque');
      const mapped = (json.tracks || []).map((t) => {
        const st = aiTrackToStudioTrack(t, artistName);
        const taskId = st.generationTaskId;
        const inferredProjectId = taskId ? taskProjectMap?.[taskId] : undefined;
        return {
          ...st,
          projectId: inferredProjectId || st.projectId || 'project_default',
        };
      });
      setTracks(mapped);
    } catch (e: any) {
      setLibraryError(e?.message || 'Erreur chargement bibliothèque');
    } finally {
      setLibraryLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadCredits().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    loadLibraryTracks().catch(() => {});
    const onUpdated = () => loadLibraryTracks().catch(() => {});
    window.addEventListener('aiLibraryUpdated', onUpdated as EventListener);
    return () => window.removeEventListener('aiLibraryUpdated', onUpdated as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, ui.search, activeProjectId]);

  // Hotkeys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      handleStudioHotkeys(e, {
        onPlayPause: () => (audioState.isPlaying ? pause() : void play()),
        onPrev: () => previousTrack(),
        onNext: () => nextTrack(),
        onFocusSearch: () => searchRef.current?.focus(),
        onClose: () => setUI({ inspectorOpen: false }),
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [audioState.isPlaying, nextTrack, pause, play, previousTrack, setUI]);

  // Sync background generations -> studio jobs
  useEffect(() => {
    (bgGenerations || []).forEach((g) => {
      const status =
        g.status === 'completed' ? 'done' : g.status === 'failed' ? 'failed' : 'running';
      updateJobStatus(g.taskId, { status, progress: g.progress });

      // mirror into queue item (by taskId)
      const match = (useStudioStore.getState().queueItems || []).find((q) => q.taskId === g.taskId) || null;
      if (match) {
        useStudioStore.getState().updateQueueItem(match.id, {
          status: g.status === 'completed' ? 'done' : g.status === 'failed' ? 'failed' : 'running',
          progress: g.progress,
        } as any);
      }
    });
  }, [bgGenerations, updateJobStatus]);

  const runGenerateRequest = async (requestBody: any) => {
    const res = await fetch('/api/suno/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      if (res.status === 402) setShowBuyCredits(true);
      throw new Error('Erreur génération');
    }

    const data = await res.json();
    if (data?.credits?.balance != null) setCreditsBalance(data.credits.balance);
    return data;
  };

  const makeRequestBodyFromForm = (form: any) => {
    const requestBody: any = {
      customMode: form.customMode,
      instrumental: form.instrumental,
      model: form.model,
      callBackUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/suno/callback` : undefined,
    };

    const tags = (form.tags || []).filter(Boolean);
    if (form.customMode) {
      if (!form.style.trim()) throw new Error('Style manquant');
      if (!form.instrumental && !form.lyrics.trim()) throw new Error('Paroles manquantes (ou coche Instrumental)');
      requestBody.title = form.title.trim() ? form.title.trim() : undefined;
      requestBody.style = [form.style, ...tags].filter(Boolean).join(', ');
      requestBody.prompt = form.instrumental ? undefined : (form.lyrics.trim() || undefined);
      requestBody.styleWeight = Number((Math.round(form.styleInfluence) / 100).toFixed(2));
      requestBody.weirdnessConstraint = Number((Math.round(form.weirdness) / 100).toFixed(2));
      requestBody.audioWeight = Number((Math.round(form.audioWeight) / 100).toFixed(2));
      requestBody.negativeTags = form.negativeTags || undefined;
      requestBody.vocalGender = form.vocalGender || undefined;
    } else {
      if (!form.description.trim()) throw new Error('Description manquante');
      requestBody.prompt = [form.description, ...tags].filter(Boolean).join(', ');
    }
    return requestBody;
  };

  const onGenerate = async (formOverride?: Record<string, any>) => {
    try {
      const form = { ...useStudioStore.getState().form, ...(formOverride || {}) } as any;
      const requestBody = makeRequestBodyFromForm(form);
      const data = await runGenerateRequest(requestBody);

      if (data?.taskId) {
        const promptText = data.prompt || requestBody.prompt || 'Musique générée';
        const title = form.customMode ? (form.title || 'Musique') : String(promptText).slice(0, 60);
        const projectId = activeProjectId || 'project_default';

        bindTaskToProject(data.taskId, projectId);
        upsertJob({
          id: data.taskId,
          projectId,
          createdAt: new Date().toISOString(),
          status: 'pending',
          progress: 0,
          paramsSnapshot: requestBody,
        });

        startBackgroundGeneration({
          id: data.id,
          taskId: data.taskId,
          status: 'pending',
          title,
          style: form.customMode ? form.style : 'Simple',
          prompt: promptText,
          progress: 0,
          startTime: Date.now(),
          estimatedTime: 60000,
        });
      }
    } catch (e: any) {
      console.error(e);
      // V1: on reste simple (les toasts existants restent dans l'ancien studio)
      alert(e?.message || 'Erreur génération');
    }
  };

  // Queue: enqueue N items then let runner start them
  const onEnqueueGenerate = () => {
    try {
      const st = useStudioStore.getState();
      const form = st.form as any;
      const requestBody = makeRequestBodyFromForm(form);
      const projectId = activeProjectId || 'project_default';
      const n = Math.max(1, Math.min(8, Number(form.variations || 1)));
      for (let i = 0; i < n; i++) {
        enqueueQueueItem({ ...requestBody, _variationIndex: i + 1, _variationTotal: n }, projectId);
      }
    } catch (e: any) {
      alert(e?.message || 'Erreur queue');
    }
  };

  // Queue runner: start pending items up to maxConcurrency
  useEffect(() => {
    if (!queueConfig?.autoRun) return;
    const maxC = queueConfig?.maxConcurrency || 1;
    const running = (queueItems || []).filter((q) => q.status === 'running').length;
    const capacity = maxC - running;
    if (capacity <= 0) return;

    const pending = (queueItems || [])
      .filter((q) => q.status === 'pending' && (q.projectId || 'project_default') === (activeProjectId || 'project_default'))
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    if (!pending.length) return;

    pending.slice(0, capacity).forEach((item) => {
      updateQueueItem(item.id, { status: 'running', progress: 0 });
      (async () => {
        try {
          const data = await runGenerateRequest(item.paramsSnapshot);
          const taskId = data?.taskId as string | undefined;
          if (!taskId) throw new Error('taskId manquant');

          const projectId = item.projectId || 'project_default';
          bindTaskToProject(taskId, projectId);
          upsertJob({
            id: taskId,
            projectId,
            createdAt: new Date().toISOString(),
            status: 'pending',
            progress: 0,
            paramsSnapshot: item.paramsSnapshot,
          });
          updateQueueItem(item.id, { taskId, status: 'running' });

          const promptText = data.prompt || item.paramsSnapshot?.prompt || 'Musique générée';
          const title =
            item.paramsSnapshot?.title ||
            (item.paramsSnapshot?.customMode ? 'Musique' : String(promptText).slice(0, 60));

          startBackgroundGeneration({
            id: data.id,
            taskId,
            status: 'pending',
            title,
            style: item.paramsSnapshot?.style || 'Simple',
            prompt: promptText,
            progress: 0,
            startTime: Date.now(),
            estimatedTime: 60000,
          });
        } catch (e: any) {
          updateQueueItem(item.id, { status: 'failed', error: e?.message || 'Erreur génération' });
        }
      })();
    });
  }, [
    activeProjectId,
    bindTaskToProject,
    queueConfig?.autoRun,
    queueConfig?.maxConcurrency,
    queueItems,
    runGenerateRequest,
    startBackgroundGeneration,
    upsertJob,
    updateQueueItem,
  ]);

  const onGenerateVariantFromTrack = (trackId: string) => {
    const st = useStudioStore.getState();
    const t = st.tracks.find((x) => x.id === trackId);
    if (!t) return;
    st.loadTrackIntoForm(trackId);
    const nextTitle = `${t.title || 'Musique'} (variante)`;
    void onGenerate({ customMode: true, title: nextTitle });
  };

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  const visibleTracks = useMemo(() => {
    const pid = activeProjectId || 'project_default';
    return (tracks || []).filter((t) => (t.projectId || 'project_default') === pid);
  }, [tracks, activeProjectId]);

  return (
    <div className="studio-pro relative h-[100svh] overflow-hidden bg-[#050505] text-white">
      <StudioBackground />

      <div className="relative z-10 flex flex-col h-full">
        <TransportBar
          currentTrackTitle={(currentTrack as any)?.title || ''}
          isPlaying={audioState.isPlaying}
          onPlayPause={() => (audioState.isPlaying ? pause() : void play())}
          onPrev={() => previousTrack()}
          onNext={() => nextTrack()}
          creditsBalance={creditsBalance}
          quotaRemaining={quota?.remaining ?? null}
          runningJobsCount={activeGenerations?.size ?? 0}
          onOpenBuyCredits={() => setShowBuyCredits(true)}
        />

        <div className="flex-1 min-h-0 px-3 pb-3">
          <div className="h-full grid grid-cols-12 gap-3">
            {/* Left Dock */}
            <div className="col-span-12 lg:col-span-3 min-h-0">
              <LeftDock onGenerate={onEnqueueGenerate} />
            </div>

            {/* Center */}
            <div className="col-span-12 lg:col-span-6 min-h-0">
              <StudioTimeline
                tracks={visibleTracks}
                loading={libraryLoading}
                error={libraryError}
                bgGenerations={bgGenerations}
                onRefreshLibrary={loadLibraryTracks}
                searchRef={searchRef}
              />
            </div>

            {/* Right Dock */}
            <div className="col-span-12 lg:col-span-3 min-h-0">
              <Inspector onGenerateVariantFromTrack={onGenerateVariantFromTrack} />
            </div>
          </div>
        </div>
      </div>

      <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />
    </div>
  );
}

