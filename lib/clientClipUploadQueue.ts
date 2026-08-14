'use client';

import { recordClipFunnelEvent } from '@/lib/analyticsClient';
import { uploadLocalMedia } from '@/lib/clientMediaUpload';

type ClipSource = {
  _id: string;
  sourceTrackId: string;
  sourceTrackType: 'track' | 'ai_track';
  title: string;
  coverUrl?: string | null;
  artist?: { name?: string; username?: string };
};

type QueueInput = {
  file: File;
  source: ClipSource;
  duration: number;
  offset: number;
  caption: string;
  tags: string[];
  challengeId?: string;
};

export type ClientClipUploadState = {
  status: 'idle' | 'preparing' | 'uploading' | 'publishing' | 'failed' | 'completed';
  progress: number;
  source: ClipSource | null;
  error?: string;
};

let snapshot: ClientClipUploadState = { status: 'idle', progress: 0, source: null };
const serverSnapshot: ClientClipUploadState = { status: 'idle', progress: 0, source: null };
let currentInput: QueueInput | null = null;
let currentClipId = '';
let currentUpload: any = null;
let running = false;
const listeners = new Set<() => void>();

function emit(patch: Partial<ClientClipUploadState>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}

async function uploadVideo(file: File, onProgress: (progress: number) => void) {
  return uploadLocalMedia(file, 'clip-video', { onProgress });
}

async function run() {
  if (running || !currentInput) return;
  running = true;
  const input = currentInput;
  try {
    emit({ status: 'preparing', progress: 0.05, error: undefined, source: input.source });
    if (!currentClipId) {
      const draftResponse = await fetch('/api/music-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTrackId: input.source.sourceTrackId, sourceTrackType: input.source.sourceTrackType }),
      });
      const draft = await draftResponse.json();
      if (!draftResponse.ok || !draft?.clip?.id) throw new Error(draft?.error || 'Brouillon impossible');
      currentClipId = draft.clip.id;
      void recordClipFunnelEvent(input.source._id, 'clip_draft_created');
    }
    if (!currentUpload) {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2 && !currentUpload; attempt += 1) {
        try {
          emit({ status: 'uploading', progress: 0.1 });
          currentUpload = await uploadVideo(input.file, (progress) => emit({ status: 'uploading', progress: 0.1 + progress * 0.78 }));
        } catch (error) {
          lastError = error;
          if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
      if (!currentUpload) throw lastError;
    }
    emit({ status: 'publishing', progress: 0.94 });
    const publishResponse = await fetch(`/api/music-clips/${currentClipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl: currentUpload.secure_url,
        videoPublicId: currentUpload.public_id,
        posterUrl: currentUpload.poster_url,
        posterPublicId: currentUpload.poster_public_id,
        videoBytes: currentUpload.bytes || input.file.size,
        videoDurationSeconds: currentUpload.duration || input.duration,
        caption: input.caption,
        tags: input.tags,
        sourceTrackOffsetSeconds: input.offset,
        sourceTrackDurationSeconds: input.duration,
        visibility: 'published',
      }),
    });
    const published = await publishResponse.json();
    if (!publishResponse.ok) throw new Error(published?.error || 'Publication impossible');
    if (input.challengeId) {
      void fetch(`/api/challenges/${encodeURIComponent(input.challengeId)}/participate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType: 'clip', contentId: currentClipId }),
      }).catch(() => {});
    }
    void recordClipFunnelEvent(input.source._id, 'clip_published');
    emit({ status: 'completed', progress: 1, error: undefined });
    window.dispatchEvent(new Event('synaura:clip-upload-completed'));
    window.setTimeout(() => {
      if (currentInput !== input || snapshot.status !== 'completed') return;
      emit({ status: 'idle', progress: 0, source: null });
      currentInput = null;
      currentClipId = '';
      currentUpload = null;
    }, 6500);
  } catch (error) {
    emit({ status: 'failed', error: error instanceof Error ? error.message : 'Publication impossible' });
  } finally {
    running = false;
  }
}

export function enqueueClientClipUpload(input: QueueInput) {
  currentInput = input;
  currentClipId = '';
  currentUpload = null;
  emit({ status: 'preparing', progress: 0.02, source: input.source, error: undefined });
  void run();
}

export function retryClientClipUpload() {
  if (!currentInput || snapshot.status !== 'failed') return;
  emit({ status: 'preparing', progress: currentUpload ? 0.9 : 0.04, error: undefined });
  void run();
}

export function subscribeClientClipUpload(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getClientClipUploadSnapshot() {
  return snapshot;
}

export function getClientClipUploadServerSnapshot(): ClientClipUploadState {
  return serverSnapshot;
}
