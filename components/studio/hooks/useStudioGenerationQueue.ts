'use client';

import { useCallback, useEffect } from 'react';
import { useBackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import { useStudioStore } from '@/lib/studio/store';
import { notify } from '@/components/NotificationCenter';
import { getSunoModelLabel, normalizeGenerationModel, SUNO_GENERATION_LIMITS } from '@/lib/sunoModels';

export function prepareStudioRequest(requestBody: any) {
  const { _endpoint, _batchIndex, _batchTotal, _expectedVariants, _sourceTrackId, duration, durationHint, ...body } = requestBody || {};
  body.model = normalizeGenerationModel(body.model);
  if (body.customMode && duration != null) {
    if (!Number.isInteger(duration) || duration < SUNO_GENERATION_LIMITS.minDuration || duration > SUNO_GENERATION_LIMITS.maxDuration) {
      throw new Error('La durée doit être un nombre entier entre 10 et 360 secondes.');
    }
    body.duration = duration;
  }
  if (body.customMode && body.instrumental) {
    delete body.prompt;
    delete body.vocalGender;
  }
  return {
    endpoint: _endpoint === 'upload-cover' ? '/api/suno/upload-cover' : '/api/suno/generate',
    body,
  };
}

export function makeStudioRequestFromForm(form: any) {
  const requestBody: any = {
    customMode: !!form.customMode,
    instrumental: !!form.instrumental,
    model: normalizeGenerationModel(form.model),
    callBackUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/suno/callback` : undefined,
  };
  const tags = (form.tags || []).filter(Boolean);
  const withinLimit = (value: string, limit: number, label: string) => {
    if (value.length > limit) throw new Error(`${label} : ${limit} caractères maximum, tags compris.`);
    return value;
  };
  const weight = (value: unknown) => {
    const number = Number(value);
    return Math.round(Math.max(0, Math.min(100, Number.isFinite(number) ? number : 50))) / 100;
  };
  if (form.customMode) {
    if (!form.style.trim()) throw new Error('Style manquant');
    if (!form.instrumental && !form.lyrics.trim()) throw new Error('Paroles manquantes (ou coche Instrumental)');
    requestBody.title = withinLimit(form.title.trim() || 'Nouvelle création', SUNO_GENERATION_LIMITS.title, 'Titre');
    requestBody.style = withinLimit([form.style, ...tags].filter(Boolean).join(', '), SUNO_GENERATION_LIMITS.style, 'Style');
    if (!form.instrumental) {
      requestBody.prompt = withinLimit(form.lyrics, SUNO_GENERATION_LIMITS.prompt, 'Paroles');
      if (form.vocalGender === 'm' || form.vocalGender === 'f') requestBody.vocalGender = form.vocalGender;
    }
    requestBody.styleWeight = weight(form.styleInfluence);
    requestBody.weirdnessConstraint = weight(form.weirdness);
    requestBody.audioWeight = weight(form.audioWeight);
    requestBody.negativeTags = form.negativeTags || undefined;
    if (form.duration != null) {
      if (!Number.isInteger(form.duration) || form.duration < SUNO_GENERATION_LIMITS.minDuration || form.duration > SUNO_GENERATION_LIMITS.maxDuration) {
        throw new Error('La durée doit être un nombre entier entre 10 et 360 secondes.');
      }
      requestBody.duration = form.duration;
    }
  } else {
    if (!form.description.trim()) throw new Error('Description manquante');
    requestBody.prompt = withinLimit([form.description, ...tags].filter(Boolean).join(', '), SUNO_GENERATION_LIMITS.simplePrompt, 'Description');
  }
  return requestBody;
}

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
      const { endpoint, body } = prepareStudioRequest(requestBody);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402) onInsufficientCredits();
        throw new Error(typeof data?.error === 'string' ? data.error : 'Erreur génération');
      }

      if (data?.credits?.balance != null) onCreditsBalance(data.credits.balance);
      if (data?.modelAdjusted) {
        notify.info('Modèle ajusté', `${getSunoModelLabel(data.model)} a été utilisé selon les modèles disponibles pour votre compte.`);
      }
      return data;
    },
    [onCreditsBalance, onInsufficientCredits]
  );

  const makeRequestBodyFromForm = useCallback(makeStudioRequestFromForm, []);

  const enqueueFromCurrentForm = useCallback(() => {
    try {
      const st = useStudioStore.getState();
      const requestBody = makeRequestBodyFromForm(st.form as any);
      const projectId = (st.activeProjectId || 'project_default') as string;
      const requestedVariants = Math.max(2, Math.min(8, Number((st.form as any).variations || 2)));
      const batchCount = Math.max(1, Math.ceil(requestedVariants / 2));
      for (let i = 0; i < batchCount; i++) {
        enqueueQueueItem(
          {
            ...requestBody,
            _batchIndex: i + 1,
            _batchTotal: batchCount,
            _expectedVariants: 2,
          },
          projectId
        );
      }
      notify.success('Queue', `${batchCount} génération(s) ajoutée(s). Le nombre de versions peut varier.`);
      return true;
    } catch (e: any) {
      notify.error('Queue', e?.message || 'Erreur');
      return false;
    }
  }, [enqueueQueueItem, makeRequestBodyFromForm]);

  const generateVariantFromTrack = useCallback(
    (trackId: string) => {
      const st = useStudioStore.getState();
      const t = st.tracks.find((x) => x.id === trackId);
      if (!t) return;
      const nextTitle = `${(t.title || 'Musique').slice(0, SUNO_GENERATION_LIMITS.title - 11)} (variante)`;
      try {
        const sourceUrl = String(t.audioUrl || '').trim();
        if (!sourceUrl) {
          notify.error('Remix', 'Aucune URL audio exploitable pour cette piste');
          return;
        }

        const lyrics = String(t.lyrics || t.prompt || '');
        const style = (t.tags || []).join(', ') || st.form.style || 'remix, polished, modern mix';
        const remixForm = {
          ...st.form,
          customMode: true,
          model: normalizeGenerationModel(t.model),
          instrumental: t.hasVocals === false || !lyrics.trim(),
          title: nextTitle,
          style,
          lyrics,
          duration: null,
        };
        st.loadTrackIntoForm(trackId);
        const requestBody = makeRequestBodyFromForm(remixForm as any);
        const projectId = (st.activeProjectId || 'project_default') as string;
        enqueueQueueItem(
          {
            ...requestBody,
            _endpoint: 'upload-cover',
            _sourceTrackId: t.id,
            uploadUrl: sourceUrl,
            sourceDurationSec: t.durationSec,
            _expectedVariants: 2,
          },
          projectId
        );
        notify.success('Queue', 'Remix guide ajoute a la queue');
      } catch (e: any) {
        notify.error('Remix', e?.message || 'Erreur');
      }
    },
    [enqueueQueueItem, makeRequestBodyFromForm]
  );

  // Sync background generations -> jobs + queue items
  useEffect(() => {
    (bgGenerations || []).forEach((g) => {
      const status = g.status === 'completed' ? 'done' : g.status === 'failed' ? 'failed' : 'running';
      updateJobStatus(g.taskId, {
        status,
        progress: g.progress,
        trackIds: Array.isArray(g.latestTracks)
          ? g.latestTracks.map((t: any) => String(t?.id || t?.audioId || t?.trackId || '')).filter(Boolean)
          : undefined,
      });

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
      // Read current state: a previous effect may already have claimed this item.
      if (useStudioStore.getState().queueItems.find((q) => q.id === item.id)?.status !== 'pending') return;
      updateQueueItem(item.id, { status: 'running', progress: 0 });
      (async () => {
        try {
          const data = await runGenerateRequest(item.paramsSnapshot);
          const taskId = data?.taskId as string | undefined;
          if (!taskId) throw new Error('taskId manquant');

          const projectId = item.projectId || 'project_default';
          const submittedParams = { ...item.paramsSnapshot, model: normalizeGenerationModel(data.model || item.paramsSnapshot?.model) };
          bindTaskToProject(taskId, projectId);
          upsertJob({
            id: taskId,
            projectId,
            createdAt: new Date().toISOString(),
            status: 'pending',
            progress: 0,
            paramsSnapshot: submittedParams,
          });
          updateQueueItem(item.id, { taskId, status: 'running', paramsSnapshot: submittedParams });

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
    bgGenerations,
  };
}

