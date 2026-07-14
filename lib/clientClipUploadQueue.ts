'use client';

import { recordClipFunnelEvent } from '@/lib/analyticsClient';

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

const CLIP_FOLDER = 'ximam/music-clips';
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

function posterUrl(videoUrl: string) {
  return videoUrl.replace('/video/upload/', '/video/upload/so_0,w_720,h_1280,c_fill,f_jpg/').replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, '.jpg$2');
}

async function uploadVideo(file: File, onProgress: (progress: number) => void) {
  const publicId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const signatureResponse = await fetch('/api/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId, resourceType: 'video', folder: CLIP_FOLDER }),
  });
  const signature = await signatureResponse.json();
  if (!signatureResponse.ok) throw new Error(signature?.error || 'Signature d’envoi impossible');
  const form = new FormData();
  form.append('file', file);
  form.append('folder', signature.folder || CLIP_FOLDER);
  form.append('public_id', signature.publicId || publicId);
  form.append('timestamp', String(signature.timestamp));
  form.append('api_key', signature.apiKey);
  form.append('signature', signature.signature);
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`);
    xhr.timeout = 10 * 60 * 1000;
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onerror = () => reject(new Error('Connexion interrompue pendant l’envoi.'));
    xhr.ontimeout = () => reject(new Error('L’envoi prend trop de temps.'));
    xhr.onload = () => {
      let response: any = null;
      try { response = JSON.parse(xhr.responseText || '{}'); } catch { /* ignore */ }
      if (xhr.status < 200 || xhr.status >= 300 || !response?.secure_url) reject(new Error(response?.error?.message || 'Envoi vidéo impossible'));
      else resolve(response);
    };
    xhr.send(form);
  });
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
        posterUrl: posterUrl(currentUpload.secure_url),
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
