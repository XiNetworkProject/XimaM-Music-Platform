// hooks/useBackgroundGeneration.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface BackgroundGeneration {
  id: string;
  taskId: string;
  status: 'pending' | 'first' | 'completed' | 'failed';
  title: string;
  style: string;
  prompt: string;
  progress: number;
  startTime: number;
  estimatedTime: number;
  retryCount?: number;
  lastError?: string;
  firstSaved?: boolean;
  completedSaved?: boolean;
  completedSaveRetries?: number;
  latestTracks?: any[];
}

export function useBackgroundGeneration() {
  const { data: session } = useSession();
  const [generations, setGenerations] = useState<BackgroundGeneration[]>([]);
  const [activeGenerations, setActiveGenerations] = useState<Set<string>>(new Set());
  const pollingRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const generationsRef = useRef<BackgroundGeneration[]>([]);
  const keyRef = useRef<string | null>(null);
  const MAX_RETRIES = 8;
  const DEBUG = process.env.NODE_ENV !== 'production';

  const saveToStorage = useCallback((items: BackgroundGeneration[]) => {
    const key = keyRef.current;
    if (!key) return;
    generationsRef.current = items;
    setGenerations(items);
    localStorage.setItem(key, JSON.stringify(items));
  }, []);

  const updateGeneration = useCallback((taskId: string, updater: (g: BackgroundGeneration) => BackgroundGeneration) => {
    setGenerations((prev) => {
      const next = prev.map((g) => (g.taskId === taskId ? updater(g) : g));
      generationsRef.current = next;
      const key = keyRef.current;
      if (key) localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, []);

  const stopPolling = useCallback((taskId: string) => {
    const timeout = pollingRefs.current.get(taskId);
    if (timeout) clearTimeout(timeout);
    pollingRefs.current.delete(taskId);
    setActiveGenerations((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    const key = `bg_generations_${session.user.id}`;
    keyRef.current = key;
    const storedGenerations = localStorage.getItem(key);
    if (storedGenerations) {
      try {
        const parsed = JSON.parse(storedGenerations) as BackgroundGeneration[];
        generationsRef.current = parsed;
        setGenerations(parsed);
        const active = new Set<string>(
          parsed
            .filter((g: BackgroundGeneration) => g.status === 'pending' || g.status === 'first')
            .map((g: BackgroundGeneration) => g.taskId)
        );
        setActiveGenerations(active);
      } catch (error) {
        if (DEBUG) console.error('Erreur parsing générations stockées:', error);
      }
    }
  }, [session?.user?.id, DEBUG]);

  const calculateProgress = (startTime: number, estimatedTime: number): number => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / Math.max(estimatedTime, 1)) * 100, 95);
    return Math.max(0, progress);
  };

  const saveTracks = useCallback(async (taskId: string, tracks: any[], status: 'partial' | 'completed') => {
    try {
      const response = await fetch('/api/suno/save-tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, tracks, status }),
      });
      if (response.ok) {
        const payload = await response.json().catch(() => ({} as any));
        const persistedCount = Number(payload?.tracksCount ?? 0);
        const success = Boolean(payload?.success);
        // Partial: considérer OK seulement si au moins 1 piste a réellement été persistée.
        if (success && (status === 'completed' || persistedCount > 0)) {
          window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
          return true;
        }
        return false;
      }
    } catch {}
    return false;
  }, []);

  const startPolling = useCallback((taskId: string) => {
    if (pollingRefs.current.has(taskId)) return;

    const mergeTracksById = (existing: any[], incoming: any[]) => {
      const map = new Map<string, any>();
      (existing || []).forEach((t, idx) => {
        const k = String(t?.id || t?.audioId || t?.trackId || t?.title || `existing_${idx}`);
        if (k) map.set(k, t);
      });
      (incoming || []).forEach((t, idx) => {
        const k = String(t?.id || t?.audioId || t?.trackId || t?.title || `incoming_${idx}`);
        if (!k) return;
        const prev = map.get(k) || {};
        map.set(k, {
          ...prev,
          ...t,
          id: t?.id || prev?.id,
          title: t?.title || prev?.title,
          audio: t?.audio || prev?.audio,
          stream: t?.stream || prev?.stream,
          image: t?.image || prev?.image,
          raw: t?.raw || prev?.raw,
          duration: t?.duration ?? prev?.duration,
        });
      });
      return Array.from(map.values());
    };

    const poll = async () => {
      try {
        const response = await fetch(`/api/suno/status?taskId=${encodeURIComponent(taskId)}`, {
          cache: "no-store",
          credentials: 'include'
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || 'Erreur polling');
        }

        const data = await response.json();
        const statusUpper = String(data.status || '').toUpperCase();
        const tracks = Array.isArray(data.tracks) ? data.tracks : [];
        const current = generationsRef.current.find((g) => g.taskId === taskId);
        const previousTracks = Array.isArray(current?.latestTracks) ? current!.latestTracks! : [];
        const mergedTracks = mergeTracksById(previousTracks, tracks);
        const availableTracks = mergedTracks.length > 0 ? mergedTracks : previousTracks;
        const elapsedMs = current ? Date.now() - current.startTime : 0;

        updateGeneration(taskId, (g) => ({
          ...g,
          retryCount: 0,
          lastError: undefined,
          progress: calculateProgress(g.startTime, g.estimatedTime),
          latestTracks: availableTracks.length > 0 ? availableTracks : g.latestTracks,
        }));

        if ((statusUpper === 'FIRST_SUCCESS' || statusUpper === 'FIRST') && availableTracks.length > 0) {
          let shouldSavePartial = false;
          let shouldForceComplete = false;
          updateGeneration(taskId, (g) => {
            const prevCount = Array.isArray(g.latestTracks) ? g.latestTracks.length : 0;
            const nextCount = availableTracks.length;
            shouldSavePartial = !g.firstSaved || nextCount > prevCount;
            // Certains jobs restent bloqués en FIRST_SUCCESS (95%) côté provider.
            // On force completion quand 2 pistes sont là, ou après long délai avec au moins 1 piste.
            shouldForceComplete = nextCount >= 2 || (nextCount >= 1 && elapsedMs > Math.max(g.estimatedTime * 2, 240000));
            return {
              ...g,
              status: shouldForceComplete ? 'completed' : 'first',
              progress: shouldForceComplete ? 100 : Math.max(g.progress, 70),
              latestTracks: availableTracks,
            };
          });
          if (shouldSavePartial) {
            const ok = await saveTracks(taskId, availableTracks, 'partial');
            if (ok) {
              updateGeneration(taskId, (g) => ({ ...g, firstSaved: true }));
            }
          }
          if (shouldForceComplete) {
            const ok = await saveTracks(taskId, availableTracks, 'completed');
            if (ok) {
              updateGeneration(taskId, (g) => ({ ...g, completedSaved: true, completedSaveRetries: 0, status: 'completed', progress: 100 }));
              stopPolling(taskId);
              return;
            }
            // Ne pas stopper: on retente au poll suivant tant que ce n'est pas persisté en base.
            updateGeneration(taskId, (g) => ({
              ...g,
              status: 'first',
              progress: Math.max(g.progress, 96),
              completedSaveRetries: (g.completedSaveRetries ?? 0) + 1,
              lastError: 'SAVE_COMPLETED_FAILED',
            }));
          }
        } else if (availableTracks.length >= 2 && elapsedMs > 30000) {
          // Fallback robuste: certains providers ne passent jamais en SUCCESS malgré 2 tracks disponibles.
          let shouldSave = false;
          updateGeneration(taskId, (g) => {
            shouldSave = !g.completedSaved;
            return { ...g, status: 'completed', progress: 100, latestTracks: availableTracks };
          });
          if (shouldSave) {
            const ok = await saveTracks(taskId, availableTracks, 'completed');
            if (ok) {
              updateGeneration(taskId, (g) => ({ ...g, completedSaved: true, completedSaveRetries: 0 }));
              stopPolling(taskId);
              return;
            }
            updateGeneration(taskId, (g) => ({
              ...g,
              status: 'first',
              progress: Math.max(g.progress, 96),
              completedSaveRetries: (g.completedSaveRetries ?? 0) + 1,
              lastError: 'SAVE_COMPLETED_FAILED',
            }));
          } else {
            stopPolling(taskId);
            return;
          }
        } else if (statusUpper === 'SUCCESS') {
          if (!availableTracks.length) {
            // Le provider peut annoncer SUCCESS avant de renvoyer les pistes.
            updateGeneration(taskId, (g) => ({
              ...g,
              status: 'pending',
              progress: Math.max(g.progress, 98),
            }));
          } else {
          let shouldSave = false;
          updateGeneration(taskId, (g) => {
            shouldSave = !g.completedSaved;
            return {
              ...g,
              status: 'completed',
              progress: 100,
            };
          });
          if (shouldSave && availableTracks.length > 0) {
            const ok = await saveTracks(taskId, availableTracks, 'completed');
            if (ok) {
              updateGeneration(taskId, (g) => ({ ...g, completedSaved: true, completedSaveRetries: 0 }));
              stopPolling(taskId);
              return;
            }
            updateGeneration(taskId, (g) => ({
              ...g,
              status: 'first',
              progress: Math.max(g.progress, 96),
              completedSaveRetries: (g.completedSaveRetries ?? 0) + 1,
              lastError: 'SAVE_COMPLETED_FAILED',
            }));
          } else {
            stopPolling(taskId);
            return;
          }
          }
        } else if (statusUpper === 'ERROR' || statusUpper.endsWith('_FAILED') || statusUpper === 'CALLBACK_EXCEPTION' || statusUpper === 'SENSITIVE_WORD_ERROR') {
          updateGeneration(taskId, (g) => ({
            ...g,
            status: 'failed',
            progress: Math.max(0, g.progress),
            lastError: statusUpper,
          }));
          stopPolling(taskId);
          return;
        } else if (elapsedMs > 480000 && availableTracks.length > 0) {
          // Timeout dur avec au moins une track exploitable -> finaliser pour débloquer l'UI.
          let shouldSave = false;
          updateGeneration(taskId, (g) => {
            shouldSave = !g.completedSaved;
            return { ...g, status: 'completed', progress: 100, latestTracks: availableTracks };
          });
          if (shouldSave) {
            const ok = await saveTracks(taskId, availableTracks, 'completed');
            if (ok) {
              updateGeneration(taskId, (g) => ({ ...g, completedSaved: true, completedSaveRetries: 0 }));
              stopPolling(taskId);
              return;
            }
            updateGeneration(taskId, (g) => ({
              ...g,
              status: 'first',
              progress: Math.max(g.progress, 96),
              completedSaveRetries: (g.completedSaveRetries ?? 0) + 1,
              lastError: 'SAVE_COMPLETED_FAILED',
            }));
          } else {
            stopPolling(taskId);
            return;
          }
        }

        const generation = generationsRef.current.find((g) => g.taskId === taskId);
        const elapsed = generation ? Date.now() - generation.startTime : 0;
        let delay = 6000;
        if (elapsed > 180000) delay = 30000;
        else if (elapsed > 120000) delay = 20000;
        else if (elapsed > 60000) delay = 12000;

        const timeout = setTimeout(poll, delay);
        pollingRefs.current.set(taskId, timeout);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur polling génération';
        let retries = 0;
        updateGeneration(taskId, (g) => {
          retries = (g.retryCount ?? 0) + 1;
          return { ...g, retryCount: retries, lastError: message };
        });

        if (retries >= MAX_RETRIES) {
          updateGeneration(taskId, (g) => ({
            ...g,
            status: 'failed',
            lastError: `Polling timeout: ${message}`,
          }));
          stopPolling(taskId);
          return;
        }

        const backoff = Math.min(4000 * retries, 30000);
        const timeout = setTimeout(poll, backoff);
        pollingRefs.current.set(taskId, timeout);
      }
    };

    setActiveGenerations((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    poll();
  }, [MAX_RETRIES, saveTracks, stopPolling, updateGeneration]);

  const startBackgroundGeneration = useCallback((generation: BackgroundGeneration) => {
    const normalized: BackgroundGeneration = {
      ...generation,
      status: 'pending',
      retryCount: 0,
      firstSaved: false,
      completedSaved: false,
      completedSaveRetries: 0,
    };
    const existing = generationsRef.current.find((g) => g.taskId === generation.taskId);
    if (existing) {
      updateGeneration(generation.taskId, () => ({
        ...existing,
        ...normalized,
      }));
    } else {
      saveToStorage([normalized, ...generationsRef.current].slice(0, 50));
    }
    startPolling(generation.taskId);
  }, [saveToStorage, startPolling, updateGeneration]);

  useEffect(() => {
    // Reprendre automatiquement le polling des jobs actifs après refresh/navigation.
    const resumable = generationsRef.current.filter((g) => g.status === 'pending' || g.status === 'first');
    resumable.forEach((g) => startPolling(g.taskId));
  }, [startPolling, session?.user?.id]);

  const cleanupCompletedGenerations = useCallback(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const filtered = generationsRef.current.filter((g) => {
      if (g.status === 'pending' || g.status === 'first') return true;
      return now - g.startTime <= oneDay;
    });
    saveToStorage(filtered);
  }, [saveToStorage]);

  useEffect(() => {
    const interval = setInterval(cleanupCompletedGenerations, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanupCompletedGenerations]);

  useEffect(() => {
    return () => {
      pollingRefs.current.forEach((timeout) => clearTimeout(timeout));
      pollingRefs.current.clear();
    };
  }, []);

  return {
    generations,
    activeGenerations,
    startBackgroundGeneration,
    cleanupCompletedGenerations
  };
}
