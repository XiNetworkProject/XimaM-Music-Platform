'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudioJobView, StudioTool } from '@/lib/studio/tools';
import { activeStudioJob, mergeStudioJobs } from '@/lib/studio/workspace';
import { reportStudioActivity } from '@/lib/studio/clientActivity';
import { feedbackFailure } from '@/lib/studio/feedback';

export type StudioCapability = { id: StudioTool; enabled: boolean; credits: number | null; displayCredits?: number | null; unavailableReason?: string | null };
/** One owner-scoped session, independent of which editor or menu is open. */
export function useStudioTasks(owner: string, demo: boolean, onCompleted: () => void) {
  const [jobs, setJobs] = useState<StudioJobView[]>([]);
  const [capabilities, setCapabilities] = useState<StudioCapability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (demo || sessionRef.current?.owner !== owner || sessionRef.current.signal.aborted) return;
    for (const job of jobs) reportStudioActivity(owner, { id: `tool:${job.id}`, taskId: job.id, kind: job.action === 'style' ? 'style' : 'tool', stage: job.action, startedAt: Date.parse(job.createdAt),
      ...(job.status === 'failed' || job.status === 'uncertain' ? feedbackFailure(job.message, { uncertain: job.status === 'uncertain' }) : { state: job.status === 'completed' ? 'success' as const : 'pending' as const, message: job.message || (job.status === 'completed' ? 'Résultat disponible dans Activité & exports.' : 'Le service traite cette demande.') }),
      ...(job.refunded ? { advice: `${job.credits} crédits restitués selon le suivi de cette opération.` } : {}),
    });
  }, [jobs, owner, demo]);
  const jobsRef = useRef(jobs); jobsRef.current = jobs;
  const completeRef = useRef(onCompleted); completeRef.current = onCompleted;
  const sessionRef = useRef<{ owner: string; signal: AbortSignal } | null>(null);
  const merge = useCallback((incoming: StudioJobView[]) => {
    const fresh = incoming.some(job => job.status === 'completed' && jobsRef.current.some(old => old.id === job.id && activeStudioJob(old)));
    const next = mergeStudioJobs(jobsRef.current, incoming);
    jobsRef.current = next; setJobs(next);
    if (fresh) completeRef.current();
  }, []);
  const load = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || session.signal.aborted || !owner || demo) return;
    setLoading(true);
    try {
      const responses = await Promise.all([fetch('/api/studio/tools', { signal: session.signal, cache: 'no-store' }), fetch('/api/studio/jobs', { signal: session.signal, cache: 'no-store' })]);
      if (responses.some(response => !response.ok)) throw new Error('Le suivi des créations est momentanément indisponible.');
      const [catalog, history] = await Promise.all(responses.map(response => response.json()));
      if (session.signal.aborted || sessionRef.current !== session) return;
      setCapabilities(catalog.tools); merge(history.jobs); setError('');
    } catch (e) { if (!session.signal.aborted) setError(e instanceof Error ? e.message : 'Suivi indisponible.'); }
    finally { if (!session.signal.aborted) setLoading(false); }
  }, [owner, demo, merge]);
  useEffect(() => {
    const controller = new AbortController();
    const session = { owner, signal: controller.signal }; sessionRef.current = session;
    jobsRef.current = []; setJobs([]); setCapabilities([]); setError(''); setLoading(false);
    if (!owner || demo) return () => controller.abort();
    void load();
    let polling = false, cursor = 0;
    const tick = async () => {
      if (document.hidden || polling) return;
      const active = jobsRef.current.filter(activeStudioJob);
      if (!active.length) return;
      polling = true;
      // Rotate through all active jobs; a stalled first job cannot starve later work.
      const batch = Array.from({ length: Math.min(5, active.length) }, (_, i) => active[(cursor + i) % active.length]);
      cursor = (cursor + batch.length) % active.length;
      try {
        const results = await Promise.all(batch.map(async job => {
          const response = await fetch(`/api/studio/jobs/${job.id}`, { signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('Connexion au suivi interrompue. Aucun nouveau lancement.');
          return (await response.json()).job as StudioJobView;
        }));
        if (!controller.signal.aborted) { merge(results); setError(''); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Suivi indisponible.'); }
      finally { polling = false; }
    };
    const timer = window.setInterval(tick, 10_000);
    const onVisible = () => { if (!document.hidden) void tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); if (sessionRef.current === session) sessionRef.current = null; };
  }, [owner, demo, load, merge]);
  return { owner, jobs, capabilities, loading, error, refresh: load, accept: (job: StudioJobView) => { if (sessionRef.current?.owner === owner && !sessionRef.current.signal.aborted) merge([job]); } };
}
export type StudioTasks = ReturnType<typeof useStudioTasks>;
