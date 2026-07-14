import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { DeviceEventEmitter } from 'react-native';
import {
  createMusicClipDraft,
  getCoverVideoPosterUrl,
  participateInChallenge,
  recordClipFunnelEvent,
  updateMusicClip,
  uploadToCloudinaryMobile,
  type CloudinaryUploadResult,
  type UploadAsset,
} from '@/api/client';
import type { MusicClipSource } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';

const STORAGE_KEY = 'synaura.clip-upload-queue.v1';
const UPLOAD_DIRECTORY = `${FileSystem.documentDirectory}synaura-clip-uploads/`;

export type ClipUploadStatus = 'queued' | 'preparing' | 'uploading' | 'publishing' | 'failed' | 'completed';

export type ClipUploadTask = {
  id: string;
  ownerId: string;
  asset: UploadAsset;
  localUri?: string;
  source: MusicClipSource;
  duration: number;
  offset: number;
  caption: string;
  tags: string[];
  challengeId?: string;
  clipId?: string;
  upload?: CloudinaryUploadResult;
  status: ClipUploadStatus;
  progress: number;
  error?: string;
  attempts: number;
  createdAt: number;
  updatedAt: number;
};

type EnqueueInput = Pick<ClipUploadTask, 'asset' | 'source' | 'duration' | 'offset' | 'caption' | 'tags' | 'challengeId'>;

type ClipUploadContextValue = {
  tasks: ClipUploadTask[];
  activeTask: ClipUploadTask | null;
  lastCompletedAt: number;
  enqueue: (input: EnqueueInput) => string;
  retry: (taskId: string) => void;
};

const ClipUploadContext = createContext<ClipUploadContextValue | null>(null);

function taskError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Le Clip n’a pas pu être publié. Réessaie depuis le Flow.';
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeExtension(asset: UploadAsset) {
  const match = (asset.name || asset.uri).match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  return match?.[1]?.toLowerCase() || 'mp4';
}

export function ClipUploadProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [tasks, setTasks] = useState<ClipUploadTask[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastCompletedAt, setLastCompletedAt] = useState(0);
  const processingRef = useRef<string | null>(null);

  const patchTask = useCallback((taskId: string, patch: Partial<ClipUploadTask>) => {
    setTasks((current) => current.map((task) => task.id === taskId
      ? { ...task, ...patch, updatedAt: Date.now() }
      : task));
  }, []);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        setTasks(parsed.map((task: ClipUploadTask) => (
          ['preparing', 'uploading', 'publishing'].includes(task.status)
            ? { ...task, status: 'queued' as const, progress: Math.min(task.progress || 0, 0.08), error: undefined }
            : task
        )).slice(0, 8));
      })
      .catch(() => {})
      .finally(() => mounted && setHydrated(true));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const persistent = tasks.filter((task) => task.status !== 'completed').slice(0, 8);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistent)).catch(() => {});
  }, [hydrated, tasks]);

  const enqueue = useCallback((input: EnqueueInput) => {
    if (!auth.user?.id) throw new Error('Connexion requise');
    const now = Date.now();
    const id = `clip-upload-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const task: ClipUploadTask = {
      ...input,
      id,
      ownerId: auth.user.id,
      duration: Math.max(15, Math.min(60, Math.round(input.duration || 30))),
      offset: Math.max(0, Math.round(input.offset || 0)),
      caption: input.caption.trim().slice(0, 280),
      tags: input.tags.slice(0, 8),
      status: 'queued',
      progress: 0.02,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    setTasks((current) => [task, ...current].slice(0, 8));
    return id;
  }, [auth.user?.id]);

  const retry = useCallback((taskId: string) => {
    setTasks((current) => current.map((task) => task.id === taskId && task.status === 'failed'
      ? { ...task, status: 'queued', progress: task.upload ? 0.9 : 0.04, error: undefined, attempts: task.attempts + 1, updatedAt: Date.now() }
      : task));
  }, []);

  useEffect(() => {
    if (!hydrated || !auth.user?.id || processingRef.current) return;
    const task = [...tasks].reverse().find((candidate) => candidate.ownerId === auth.user?.id && candidate.status === 'queued');
    if (!task) return;
    processingRef.current = task.id;

    void (async () => {
      let workingAsset = task.asset;
      let clipId = task.clipId;
      let upload = task.upload;
      try {
        patchTask(task.id, { status: 'preparing', progress: Math.max(0.03, task.progress), error: undefined });
        if (!task.localUri) {
          if (!FileSystem.documentDirectory) throw new Error('Stockage temporaire indisponible.');
          await FileSystem.makeDirectoryAsync(UPLOAD_DIRECTORY, { intermediates: true }).catch(() => {});
          const localUri = `${UPLOAD_DIRECTORY}${task.id}.${safeExtension(task.asset)}`;
          await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
          await FileSystem.copyAsync({ from: task.asset.uri, to: localUri });
          workingAsset = { ...task.asset, uri: localUri };
          patchTask(task.id, { localUri, asset: workingAsset, progress: 0.06 });
        } else {
          const info = await FileSystem.getInfoAsync(task.localUri);
          if (!info.exists) throw new Error('La vidéo n’est plus accessible. Recommence la création du Clip.');
          workingAsset = { ...task.asset, uri: task.localUri };
        }

        if (!clipId) {
          const draft = await createMusicClipDraft({
            sourceTrackId: task.source.sourceTrackId,
            sourceTrackType: task.source.sourceTrackType,
          });
          clipId = draft.id;
          patchTask(task.id, { clipId, progress: 0.09 });
          void recordClipFunnelEvent(task.source._id, 'clip_draft_created');
        }

        if (!upload) {
          let uploadError: unknown = null;
          for (let attempt = 0; attempt < 2 && !upload; attempt += 1) {
            try {
              let lastReportedProgress = 0;
              patchTask(task.id, { status: 'uploading', progress: 0.1 });
              upload = await uploadToCloudinaryMobile(workingAsset, 'video', 'ximam/music-clips', {
                onProgress: (progress) => {
                  if (progress < 1 && progress - lastReportedProgress < 0.02) return;
                  lastReportedProgress = progress;
                  patchTask(task.id, { status: 'uploading', progress: 0.1 + progress * 0.78 });
                },
              });
            } catch (error) {
              uploadError = error;
              if (attempt === 0) await wait(1200);
            }
          }
          if (!upload) throw uploadError;
          patchTask(task.id, { upload, progress: 0.9 });
        }

        patchTask(task.id, { status: 'publishing', progress: 0.94 });
        await updateMusicClip(clipId, {
          videoUrl: upload.secureUrl,
          videoPublicId: upload.publicId,
          posterUrl: getCoverVideoPosterUrl(upload.secureUrl),
          videoBytes: upload.bytes,
          videoDurationSeconds: upload.duration || task.duration,
          caption: task.caption,
          tags: task.tags,
          sourceTrackOffsetSeconds: task.offset,
          sourceTrackDurationSeconds: task.duration,
          visibility: 'published',
        });
        if (task.challengeId) {
          await participateInChallenge(task.challengeId, { contentType: 'clip', contentId: clipId }).catch(() => {});
        }
        void recordClipFunnelEvent(task.source._id, 'clip_published');
        patchTask(task.id, { status: 'completed', progress: 1, error: undefined });
        setLastCompletedAt(Date.now());
        DeviceEventEmitter.emit('synaura:clip-upload-completed', { clipId, sourceTrackId: task.source._id });
        if (workingAsset.uri.startsWith('file:')) {
          void FileSystem.deleteAsync(workingAsset.uri, { idempotent: true }).catch(() => {});
        }
        setTimeout(() => setTasks((current) => current.filter((item) => item.id !== task.id)), 6500);
      } catch (error) {
        patchTask(task.id, { status: 'failed', error: taskError(error) });
      } finally {
        processingRef.current = null;
      }
    })();
  }, [auth.user?.id, hydrated, patchTask, tasks]);

  const activeTask = useMemo(() => (
    tasks.find((task) => task.ownerId === auth.user?.id && ['preparing', 'uploading', 'publishing', 'queued'].includes(task.status))
    || tasks.find((task) => task.ownerId === auth.user?.id && task.status === 'failed')
    || tasks.find((task) => task.ownerId === auth.user?.id && task.status === 'completed')
    || null
  ), [auth.user?.id, tasks]);

  const value = useMemo<ClipUploadContextValue>(() => ({ tasks, activeTask, lastCompletedAt, enqueue, retry }), [activeTask, enqueue, lastCompletedAt, retry, tasks]);
  return <ClipUploadContext.Provider value={value}>{children}</ClipUploadContext.Provider>;
}

export function useClipUploads() {
  const value = useContext(ClipUploadContext);
  if (!value) throw new Error('useClipUploads must be used inside ClipUploadProvider');
  return value;
}
