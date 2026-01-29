'use client';

import { useCallback, useEffect } from 'react';
import { useBackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import { useStudioStore } from '@/lib/studio/store';
import { notify } from '@/components/NotificationCenter';

export function useStudioGenerationQueue({
  onInsufficientCredits,
  onCreditsBalance,
}: {
  onInsufficientCredits: () => void;
  onCreditsBalance: (balance: number) => void;
}) {
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const queueItems = useStudioStore((s) => s.queueItems);
  const queueConfig = useStudioStore((s) => s.queueConfig);
  const enqueueQueueItem = useStudioStore((s) => s.enqueueQueueItem);
  const updateQueueItem = useStudioStore((s) => s.updateQueueItem);
  const retryQueueItem = useStudioStore((s) => s.retryQueueItem);

  const bindTaskToProject = useStudioStore((s) => s.bindTaskToProject);
  const upsertJob = useStudioStore((s) => s.upsertJob);
  const updateJobStatus = useStudioStore((s) => s.updateJobStatus);

  const { generations: bgGenerations, startBackgroundGeneration } = useBackgroundGeneration();

  const runGenerateRequest = useCallback(
    async (requestBody: any) => {
      const res = await fetch('/api/suno/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        if (res.status === 402) onInsufficientCredits();
        throw new Error('Erreur génération');
      }

      const data = await res.json();
      if (data?.credits?.balance != null) onCreditsBalance(data.credits.balance);
      return data;
    },
    [onCreditsBalance, onInsufficientCredits]
  );

  const makeRequestBodyFromForm = useCallback((form: any) => {
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
  }, []);

  const enqueueFromCurrentForm = useCallback(() => {
    try {
      const st = useStudioStore.getState();
      const requestBody = makeRequestBodyFromForm(st.form as any);
      const projectId = (st.activeProjectId || 'project_default') as string;
      const n = Math.max(1, Math.min(8, Number((st.form as any).variations || 1)));
      for (let i = 0; i < n; i++) {
        enqueueQueueItem({ ...requestBody, _variationIndex: i + 1, _variationTotal: n }, projectId);
      }
      notify.success('Queue', `${n} job(s) ajouté(s)`);
    } catch (e: any) {
      notify.error('Queue', e?.message || 'Erreur');
    }
  }, [enqueueQueueItem, makeRequestBodyFromForm]);

  const generateVariantFromTrack = useCallback(
    (trackId: string) => {
      const st = useStudioStore.getState();
      const t = st.tracks.find((x) => x.id === trackId);
      if (!t) return;
      st.loadTrackIntoForm(trackId);
      const nextTitle = `${t.title || 'Musique'} (variante)`;
      try {
        const requestBody = makeRequestBodyFromForm({ ...st.form, customMode: true, title: nextTitle } as any);
        const projectId = (st.activeProjectId || 'project_default') as string;
        enqueueQueueItem({ ...requestBody, title: nextTitle }, projectId);
        notify.success('Queue', 'Variante ajoutée à la queue');
      } catch (e: any) {
        notify.error('Variante', e?.message || 'Erreur');
      }
    },
    [enqueueQueueItem, makeRequestBodyFromForm]
  );

  // Sync background generations -> jobs + queue items
  useEffect(() => {
    (bgGenerations || []).forEach((g) => {
      const status = g.status === 'completed' ? 'done' : g.status === 'failed' ? 'failed' : 'running';
      updateJobStatus(g.taskId, { status, progress: g.progress });

      const match = (useStudioStore.getState().queueItems || []).find((q) => q.taskId === g.taskId) || null;
      if (match) {
        useStudioStore.getState().updateQueueItem(match.id, {
          status: g.status === 'completed' ? 'done' : g.status === 'failed' ? 'failed' : 'running',
          progress: g.progress,
        } as any);
      }
    });
  }, [bgGenerations, updateJobStatus]);

  // Queue runner: start pending items up to maxConcurrency for active project
  useEffect(() => {
    if (!queueConfig?.autoRun) return;
    const maxC = queueConfig?.maxConcurrency || 1;
    const running = (queueItems || []).filter((q) => q.status === 'running').length;
    const capacity = maxC - running;
    if (capacity <= 0) return;

    const pid = activeProjectId || 'project_default';
    const pending = (queueItems || [])
      .filter((q) => q.status === 'pending' && (q.projectId || 'project_default') === pid)
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
          notify.error('Queue', e?.message || 'Erreur génération');
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

  return {
    enqueueFromCurrentForm,
    generateVariantFromTrack,
    retryQueueItem,
  };
}

