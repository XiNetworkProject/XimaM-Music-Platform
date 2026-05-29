'use client';

import { useMemo } from 'react';
import { Clock, CheckCircle2, XCircle, Loader2, Play, Radio, Sparkles, Waves } from 'lucide-react';
import type { BackgroundGeneration } from '@/hooks/useBackgroundGeneration';
import type { StudioTrack } from '@/lib/studio/types';
import { useAudioPlayer } from '@/app/providers';
import { useStudioStore } from '@/lib/studio/store';
import LibraryPanel from '@/components/studio/Library/LibraryPanel';
import QueuePanel from '@/components/studio/Center/QueuePanel';

function statusChip(g: BackgroundGeneration) {
  if (g.status === 'pending') return { label: 'running', icon: <Loader2 className="w-3 h-3 animate-spin" /> };
  if (g.status === 'first') return { label: 'preview', icon: <Radio className="w-3 h-3" /> };
  if (g.status === 'completed') return { label: 'done', icon: <CheckCircle2 className="w-3 h-3" /> };
  return { label: 'failed', icon: <XCircle className="w-3 h-3" /> };
}

function playableUrl(track: any): string {
  return String(
    track?.audio ||
      track?.audio_url ||
      track?.audioUrl ||
      track?.stream ||
      track?.stream_audio_url ||
      track?.streamAudioUrl ||
      ''
  ).trim();
}

function coverUrl(track: any): string {
  return String(track?.image || track?.image_url || track?.imageUrl || '/brand/2026/synaura-symbol-2026-white.png').trim();
}

function trackTitle(g: BackgroundGeneration, track: any, index: number): string {
  return String(track?.title || track?.promptTitle || `${g.title || 'Generation'} ${index + 1}`).trim();
}

export default function StudioTimeline({
  tracks,
  loading,
  error,
  bgGenerations,
  onRefreshLibrary,
  searchRef,
}: {
  tracks: StudioTrack[];
  loading: boolean;
  error: string | null;
  bgGenerations: BackgroundGeneration[];
  onRefreshLibrary: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { setQueueAndPlay } = useAudioPlayer();
  const activeProjectId = useStudioStore((s) => s.activeProjectId);
  const mobileTab = useStudioStore((s) => s.ui.mobileTab);
  const jobs = useStudioStore((s) => s.jobs);

  const sortedJobs = useMemo(() => {
    const pid = activeProjectId || 'project_default';
    const copy = [...(jobs || [])].filter((j) => (j.projectId || 'project_default') === pid);
    copy.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return copy.slice(0, 30);
  }, [jobs, activeProjectId]);

  const liveGenerations = useMemo(() => {
    const taskIds = new Set(sortedJobs.map((j) => j.id));
    return [...(bgGenerations || [])]
      .filter((g) => taskIds.has(g.taskId) || g.status === 'pending' || g.status === 'first')
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      .slice(0, 4);
  }, [bgGenerations, sortedJobs]);

  const playLiveGeneration = (generation: BackgroundGeneration, track: any, trackIndex: number) => {
    const playableTracks = (generation.latestTracks || [])
      .map((item: any, index: number) => {
        const audioUrl = playableUrl(item);
        if (!audioUrl) return null;
        return {
          _id: `suno-live-${generation.taskId}-${item?.id || index}`,
          title: trackTitle(generation, item, index),
          artist: { _id: 'ai', name: 'Synaura Studio', username: 'synaura-studio' },
          duration: Number(item?.duration || 120),
          audioUrl,
          coverUrl: coverUrl(item),
          genre: ['IA', 'Preview'],
          plays: 0,
          likes: [],
          comments: [],
          lyrics: String(item?.raw?.prompt || generation.prompt || '').trim(),
          backupAudioUrls: [item?.audio, item?.stream, item?.audio_url, item?.stream_audio_url].filter(Boolean),
        };
      })
      .filter(Boolean);

    const selectedUrl = playableUrl(track);
    if (!selectedUrl || playableTracks.length === 0) return;
    const selectedId = `suno-live-${generation.taskId}-${track?.id || trackIndex}`;
    const selectedIndex = Math.max(0, playableTracks.findIndex((item: any) => item._id === selectedId));
    setQueueAndPlay(playableTracks as any, selectedIndex);
  };

  const onPlayTrack = (t: StudioTrack) => {
    const playerTrack: any = {
      _id: `ai-${t.id}`,
      title: t.title,
      artist: { _id: 'ai', name: t.artistName, username: t.artistName },
      duration: t.durationSec || 120,
      audioUrl: t.audioUrl || '',
      coverUrl: t.coverUrl || '/brand/2026/synaura-symbol-2026-white.png',
      genre: ['IA', 'Généré'],
      plays: 0,
      likes: [],
      comments: [],
      lyrics: (t.lyrics || t.prompt || '').trim(),
    };
    // Play in a queue to allow next/prev inside the library
    const queue = tracks.map((x) => ({
      _id: `ai-${x.id}`,
      title: x.title,
      artist: { _id: 'ai', name: x.artistName, username: x.artistName },
      duration: x.durationSec || 120,
      audioUrl: x.audioUrl || '',
      coverUrl: x.coverUrl || '/brand/2026/synaura-symbol-2026-white.png',
      genre: ['IA', 'Généré'],
      plays: 0,
      likes: [],
      comments: [],
      lyrics: (x.lyrics || x.prompt || '').trim(),
    }));
    const idx = tracks.findIndex((x) => x.id === t.id);
    setQueueAndPlay(queue as any, Math.max(0, idx));
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      {liveGenerations.length > 0 ? (
        <div className="panel-suno overflow-hidden">
          <div className="p-3 border-b border-border-secondary flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-foreground-tertiary inline-flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                LIVE SESSION
              </div>
              <div className="text-sm font-semibold text-foreground-primary">Generation A/B</div>
            </div>
            <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
              Preview des que Suno stream
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-3 space-y-3">
            {liveGenerations.map((g) => {
              const chip = statusChip(g);
              const previewSlots = Array.from({ length: Math.max(2, (g.latestTracks || []).length || 0) });
              return (
                <div key={g.taskId} className="rounded-2xl border border-white/10 bg-black/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300/20 to-amber-200/10 text-cyan-100">
                      {chip.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{g.title || 'Generation Suno'}</div>
                      <div className="truncate text-[11px] text-white/45">{g.style || g.prompt || g.taskId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{chip.label}</div>
                      <div className="text-[11px] text-white/35">{Math.round(g.progress || 0)}%</div>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-white to-amber-200"
                      style={{ width: `${Math.max(3, Math.min(100, Math.round(g.progress || 0)))}%` }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {previewSlots.map((_, index) => {
                      const track = (g.latestTracks || [])[index];
                      const url = playableUrl(track);
                      const isReady = Boolean(url);
                      return (
                        <div
                          key={`${g.taskId}-${track?.id || index}`}
                          className={`group relative overflow-hidden rounded-2xl border p-3 transition ${
                            isReady
                              ? 'border-cyan-200/20 bg-cyan-200/[0.07] hover:bg-cyan-200/[0.11]'
                              : 'border-white/10 bg-white/[0.035]'
                          }`}
                        >
                          <div
                            className="absolute inset-0 opacity-20 blur-2xl"
                            style={{ backgroundImage: `url(${coverUrl(track)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                          />
                          <div className="relative flex items-center gap-3">
                            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                              {isReady ? (
                                <img src={coverUrl(track)} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Waves className="h-5 w-5 animate-pulse text-white/40" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                                Variante {index === 0 ? 'A' : index === 1 ? 'B' : index + 1}
                              </div>
                              <div className="truncate text-sm font-semibold text-white">
                                {isReady ? trackTitle(g, track, index) : 'Preparation du stream'}
                              </div>
                              <div className="mt-1 text-[11px] text-white/40">
                                {isReady ? 'Lecture preview disponible' : 'Carte deja reservee'}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={!isReady}
                              onClick={() => playLiveGeneration(g, track, index)}
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition hover:scale-105 disabled:scale-100 disabled:bg-white/10 disabled:text-white/30"
                              title={isReady ? 'Lire la preview' : 'Preview pas encore prete'}
                            >
                              {isReady ? <Play className="h-4 w-4 fill-current" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <QueuePanel />

      {mobileTab !== 'library' ? (
        <div className="panel-suno overflow-hidden">
          <div className="p-3 border-b border-border-secondary">
            <div className="text-[11px] text-foreground-tertiary">CENTER</div>
            <div className="text-sm font-semibold text-foreground-primary">Timeline</div>
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            {sortedJobs.length === 0 ? (
              <div className="text-sm text-foreground-tertiary">Aucun job en cours.</div>
            ) : (
              <div className="grid gap-2">
                {sortedJobs.map((j) => {
                  const bg = (bgGenerations || []).find((x) => x.taskId === j.id) || null;
                  const chip = bg ? statusChip(bg) : { label: j.status, icon: <Clock className="w-3 h-3" /> };
                  return (
                    <div
                      key={j.id}
                      className="rounded-xl border border-border-secondary bg-white/5 px-3 py-2 flex items-center gap-3"
                    >
                      <div className="text-foreground-tertiary">{chip.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-foreground-primary truncate">
                          {j.paramsSnapshot?.title || j.paramsSnapshot?.prompt || 'Génération'}
                        </div>
                        <div className="text-[11px] text-foreground-tertiary truncate">
                          {j.paramsSnapshot?.style || j.paramsSnapshot?.model || ''}
                        </div>
                      </div>
                      <div className="text-[11px] text-foreground-tertiary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {chip.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {mobileTab !== 'timeline' ? (
        <LibraryPanel
          tracks={tracks}
          loading={loading}
          error={error}
          onRefresh={onRefreshLibrary}
          searchRef={searchRef}
          onPlayTrack={onPlayTrack}
        />
      ) : null}
    </div>
  );
}

