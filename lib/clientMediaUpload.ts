'use client';

import type { LocalMediaKind, StoredLocalMedia } from '@/lib/localMediaStorage';

export type LocalMediaUploadResult = StoredLocalMedia & { storage: 'local'; success: boolean };

export function uploadLocalMedia(
  file: File,
  kind: LocalMediaKind,
  options: { onProgress?: (progress: number) => void; signal?: AbortSignal } = {},
): Promise<LocalMediaUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/media/upload?kind=${encodeURIComponent(kind)}`);
    xhr.withCredentials = true;
    xhr.timeout = 30 * 60 * 1000;
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name || 'upload.bin'));
    xhr.setRequestHeader('X-File-Size', String(file.size));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) options.onProgress?.(Math.min(1, event.loaded / event.total));
    };
    xhr.onerror = () => reject(new Error('Connexion interrompue pendant l envoi'));
    xhr.ontimeout = () => reject(new Error('L envoi du fichier a expire'));
    xhr.onabort = () => reject(new DOMException('Envoi annule', 'AbortError'));
    xhr.onload = () => {
      let payload: any = null;
      try { payload = JSON.parse(xhr.responseText || '{}'); } catch { /* response invalide */ }
      if (xhr.status < 200 || xhr.status >= 300 || !payload?.secure_url || !payload?.public_id) {
        reject(new Error(payload?.error || `Envoi impossible (${xhr.status})`));
        return;
      }
      options.onProgress?.(1);
      resolve(payload as LocalMediaUploadResult);
    };
    const abort = () => xhr.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    xhr.addEventListener('loadend', () => options.signal?.removeEventListener('abort', abort), { once: true });
    xhr.send(file);
  });
}

export async function cleanupLocalMediaUploads(publicIds: Array<string | null | undefined>) {
  const ids = publicIds.filter((value): value is string => Boolean(value));
  if (!ids.length) return;
  await fetch('/api/upload/cleanup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicIds: ids }),
  }).catch(() => null);
}
