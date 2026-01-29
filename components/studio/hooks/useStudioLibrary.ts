'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { fetchCreditsBalance } from '@/lib/credits';
import { useStudioStore } from '@/lib/studio/store';
import { aiTrackToStudioTrack } from '@/lib/studio/adapters';
import { notify } from '@/components/NotificationCenter';

type TracksApiResponse = { tracks?: any[]; error?: string };

export function useStudioLibrary() {
  const { data: session } = useSession();
  const userId = session?.user?.id as string | undefined;

  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const taskProjectMap = useStudioStore((s) => s.taskProjectMap);
  const tracks = useStudioStore((s) => s.tracks);
  const setTracks = useStudioStore((s) => s.setTracks);
  const ui = useStudioStore((s) => s.ui);

  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const artistName = useMemo(() => {
    const u: any = session?.user;
    return (u?.name || u?.username || u?.email || 'Artiste') as string;
  }, [session?.user]);

  const loadCredits = async () => {
    const data = await fetchCreditsBalance();
    setCreditsBalance(data?.balance ?? 0);
  };

  const loadLibraryTracks = async () => {
    if (!userId) return;
    try {
      setLibraryLoading(true);
      setLibraryError(null);
      const q = (ui.search || '').trim();
      const url = `/api/ai/library/tracks?limit=200&offset=0&search=${encodeURIComponent(q)}`;
      const res = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
      const json = (await res.json()) as TracksApiResponse;
      if (!res.ok) throw new Error(json?.error || 'Erreur chargement bibliothèque');

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
      const msg = e?.message || 'Erreur chargement bibliothèque';
      setLibraryError(msg);
      notify.error('Studio', msg);
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    loadCredits().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    loadLibraryTracks().catch(() => {});
    const onUpdated = () => loadLibraryTracks().catch(() => {});
    window.addEventListener('aiLibraryUpdated', onUpdated as EventListener);
    return () => window.removeEventListener('aiLibraryUpdated', onUpdated as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ui.search, activeProjectId]);

  const visibleTracks = useMemo(() => {
    const pid = activeProjectId || 'project_default';
    return (tracks || []).filter((t) => (t.projectId || 'project_default') === pid);
  }, [tracks, activeProjectId]);

  return {
    session,
    userId,
    artistName,
    creditsBalance,
    setCreditsBalance,
    libraryLoading,
    libraryError,
    loadLibraryTracks,
    visibleTracks,
  };
}

