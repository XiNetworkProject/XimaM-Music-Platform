'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Check, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { dismissClientClipUpload, getClientClipUploadServerSnapshot, getClientClipUploadSnapshot, retryClientClipUpload, subscribeClientClipUpload } from '@/lib/clientClipUploadQueue';
import './clip-upload-indicator.css';

export default function ClipUploadIndicator() {
  const task = useSyncExternalStore(subscribeClientClipUpload, getClientClipUploadSnapshot, getClientClipUploadServerSnapshot);
  const busy = !['idle', 'failed', 'completed'].includes(task.status);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);
  if (task.status === 'idle') return null;
  const failed = task.status === 'failed';
  const completed = task.status === 'completed';
  const transferring = task.status === 'uploading';
  const percent = Math.round(task.progress * 100);
  const label = failed ? 'Envoi interrompu' : completed ? 'Clip publié' : transferring ? `Envoi · ${percent} %` : task.status === 'processing' ? 'Vérification de la vidéo' : task.status === 'publishing' ? 'Publication du clip' : 'Préparation de l’envoi';
  return <aside className="clip-upload-badge" aria-label="Suivi de votre clip" data-state={task.status}>
    <span className="clip-upload-symbol" aria-hidden="true">{completed ? <Check /> : failed ? <RefreshCw /> : transferring ? <Upload /> : <Loader2 className="clip-upload-spinner" />}</span>
    <div className="clip-upload-description"><p role="status" aria-live="polite" aria-atomic="true">{label}</p><span>{failed ? task.error : busy ? 'Vous pouvez continuer à naviguer.' : 'Disponible dans Live'}</span>
      {transferring && <progress value={percent} max={100} aria-label="Octets de la vidéo transférés" />}
    </div>
    {failed && <button onClick={retryClientClipUpload} aria-label="Réessayer l’envoi du clip"><RefreshCw size={17} /></button>}
    {!busy && <button onClick={dismissClientClipUpload} aria-label="Fermer le suivi du clip"><X size={17} /></button>}
  </aside>;
}
