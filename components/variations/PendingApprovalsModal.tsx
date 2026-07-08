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

const FALLBACK_COVER = '/brand/2026/synaura-symbol-2026.png';

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
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-[1.8rem] bg-[#fffaf2] p-5 shadow-[0_-20px_60px_rgba(30,25,20,0.2)] sm:rounded-[1.8rem] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7357C6]">Variations</p>
            <h2 className="mt-0.5 text-xl font-black text-[#171313]">Variations à valider</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.05] text-black/50 transition hover:bg-black hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.remixId} className="rounded-[1.3rem] border border-black/[0.08] bg-white p-3.5">
              <div className="flex items-center gap-3">
                <img src={item.coverUrl || FALLBACK_COVER} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#171313]">{item.title}</p>
                  <p className="truncate text-xs font-bold text-black/46">par {item.creator.name || item.creator.username}</p>
                  <Link href={item.source.trackUrl} className="mt-0.5 block truncate text-[11px] font-semibold text-black/38 hover:text-[#7357C6]">
                    Inspiré de {item.source.title}
                  </Link>
                </div>
                <Link
                  href={item.trackUrl}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.05] text-black/60 transition hover:bg-black hover:text-white"
                  aria-label="Écouter"
                >
                  <Play className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-black/34">{formatDate(item.createdAt)}</p>

              {confirmingId === item.remixId ? (
                <div className="mt-3 rounded-[1rem] border border-[#D96D63]/30 bg-[#D96D63]/[0.06] p-3">
                  <p className="flex items-start gap-2 text-xs font-bold text-[#9b352e]">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Refuser cette variation ? Le brouillon reste privé chez le créateur.
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="h-9 flex-1 rounded-full bg-black/[0.06] text-xs font-black text-black/60 transition hover:bg-black/[0.1]"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.remixId}
                      onClick={() => decide(item.remixId, 'reject')}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#D96D63] text-xs font-black text-white transition hover:bg-[#c25850] disabled:opacity-60"
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
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#7357C6] text-xs font-black text-white transition hover:bg-[#5f46a8] disabled:opacity-60"
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
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-black/[0.12] text-xs font-black text-black/60 transition hover:border-[#D96D63] hover:text-[#D96D63] disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" /> Refuser
                  </button>
                </div>
              )}
            </div>
          ))}

          {!items.length ? (
            <p className="py-10 text-center text-sm font-semibold text-black/40">Aucune variation en attente.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
