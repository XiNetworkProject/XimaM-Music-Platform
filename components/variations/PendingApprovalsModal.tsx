'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Loader2, Play, X } from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

export type PendingVariation = {
  remixId: string;
  childTrackId: string;
  title: string;
  coverUrl: string | null;
  audioUrl: string;
  duration: number;
  createdAt: string;
  trackUrl: string;
  creator: { id: string; username: string; name: string; avatar: string | null };
  source: {
    sourceTrackId: string;
    sourceTrackType: 'track' | 'ai_track';
    title: string;
    coverUrl: string | null;
    trackUrl: string;
    artist: string;
    artistUsername: string;
  };
};

const FALLBACK_COVER = '/default-cover.svg';

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function PendingApprovalsModal({
  open,
  onClose,
  items,
  onDecided,
}: {
  open: boolean;
  onClose: () => void;
  items: PendingVariation[];
  onDecided: (remixId: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!open) return null;

  async function decide(remixId: string, decision: 'approve' | 'reject') {
    setBusyId(remixId);
    try {
      const res = await fetch(`/api/remixes/${encodeURIComponent(remixId)}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Action impossible pour le moment.');
      notify.success(
        decision === 'approve' ? 'Variation publiée' : 'Variation refusée',
        decision === 'approve' ? 'Elle est maintenant visible publiquement.' : 'Le brouillon reste privé chez le créateur.',
      );
      setConfirmingId(null);
      onDecided(remixId);
    } catch (error: any) {
      notify.error('Erreur', error?.message || 'Action impossible pour le moment.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="v2-creation fixed inset-0 z-[300] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="chambre-pending-variations max-h-[85vh] w-full max-w-lg overflow-y-auto p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="v2-kicker">L’atelier / Variations</p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.05em] text-[var(--v2-text)]">Variations à valider</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--v2-line)] text-[var(--v2-muted)] transition hover:bg-[var(--v2-raised)] hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.remixId} className="chambre-variation-item border p-3.5">
              <div className="flex items-center gap-3">
                <img src={item.coverUrl || FALLBACK_COVER} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--v2-text)]">{item.title}</p>
                  <p className="truncate text-xs text-[var(--v2-muted)]">par {item.creator.name || item.creator.username}</p>
                  <Link href={item.source.trackUrl} className="mt-0.5 block truncate text-[11px] text-[var(--v2-muted)] hover:text-[var(--v2-accent)]">
                    Inspiré de {item.source.title}
                  </Link>
                </div>
                <Link
                  href={item.trackUrl}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--v2-line)] text-[var(--v2-text)] transition hover:bg-[var(--v2-raised)]"
                  aria-label="Écouter"
                >
                  <Play className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="mt-2 text-[11px] text-[var(--v2-muted)]">{formatDate(item.createdAt)}</p>

              {confirmingId === item.remixId ? (
                <div className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-3">
                  <p className="flex items-start gap-2 text-xs text-red-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Refuser cette variation ? Le brouillon reste privé chez le créateur.
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="h-10 flex-1 rounded-full border border-[var(--v2-line)] text-xs font-semibold text-[var(--v2-text)] transition hover:bg-[var(--v2-raised)]"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.remixId}
                      onClick={() => decide(item.remixId, 'reject')}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-red-300 text-xs font-semibold text-[var(--v2-bg)] transition hover:bg-red-200 disabled:opacity-60"
                    >
                      {busyId === item.remixId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirmer le refus'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.remixId}
                    onClick={() => decide(item.remixId, 'approve')}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--v2-accent-fill)] text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    {busyId === item.remixId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> Accepter
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.remixId}
                    onClick={() => setConfirmingId(item.remixId)}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--v2-line)] text-xs font-semibold text-[var(--v2-muted)] transition hover:border-red-300 hover:text-red-200 disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" /> Refuser
                  </button>
                </div>
              )}
            </div>
          ))}

          {!items.length ? (
            <p className="py-10 text-center text-sm text-[var(--v2-muted)]">Aucune variation en attente.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
