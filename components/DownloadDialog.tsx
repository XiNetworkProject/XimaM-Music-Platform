'use client';

import { useState } from 'react';
import { Download, X, AlertTriangle, CheckCircle, FileText, Shield, Copyright } from 'lucide-react';
import { notify } from '@/components/NotificationCenter';
import { UModal, UModalBody, UButton } from '@/components/ui/UnifiedUI';

interface DownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trackTitle: string;
  artistName: string;
  isDownloading?: boolean;
}

export default function DownloadDialog({
  isOpen,
  onClose,
  onConfirm,
  trackTitle,
  artistName,
  isDownloading = false
}: DownloadDialogProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedCopyright, setAcceptedCopyright] = useState(false);

  const handleConfirm = () => {
    if (!acceptedTerms || !acceptedCopyright) {
      notify.error('Erreur', 'Veuillez accepter toutes les conditions');
      return;
    }
    onConfirm();
  };

  const handleClose = () => {
    if (!isDownloading) {
      setAcceptedTerms(false);
      setAcceptedCopyright(false);
      onClose();
    }
  };

  return (
    <UModal open={isOpen} onClose={handleClose} zClass="z-[200]" size="md" showClose={false}>
      <UModalBody className="!bg-[#fffaf2] !text-[#171313]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/38">Télécharger ce son</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Garder une copie</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-black/52">
              Le fichier reste lié aux droits de l’artiste. Valide simplement les deux points avant de lancer le téléchargement.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDownloading}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[0.06] text-black/56 transition hover:bg-black/[0.1]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-black/[0.08] bg-white p-4 shadow-[0_16px_44px_rgba(44,33,19,0.08)]">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-[1rem] bg-[#171313] text-white">
              <Download size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-black">{trackTitle}</h3>
              <p className="truncate text-sm font-bold text-black/46">{artistName}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer gap-3 rounded-[1.25rem] border border-black/[0.08] bg-white/80 p-4 transition hover:bg-white">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              disabled={isDownloading}
              className="mt-1 h-4 w-4 rounded border-black/20 text-[#171313] focus:ring-[#171313]"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-black">
                <Shield size={15} />
                Usage personnel
              </span>
              <span className="mt-1 block text-sm leading-6 text-black/52">
                Je n’utilise pas ce fichier pour une redistribution ou un usage commercial sans autorisation.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer gap-3 rounded-[1.25rem] border border-black/[0.08] bg-white/80 p-4 transition hover:bg-white">
            <input
              type="checkbox"
              checked={acceptedCopyright}
              onChange={(e) => setAcceptedCopyright(e.target.checked)}
              disabled={isDownloading}
              className="mt-1 h-4 w-4 rounded border-black/20 text-[#171313] focus:ring-[#171313]"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-black">
                <Copyright size={15} />
                Droits respectés
              </span>
              <span className="mt-1 block text-sm leading-6 text-black/52">
                Je respecte les droits de l’artiste et les règles de Synaura.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-[1.2rem] border border-[#ffb84d]/30 bg-[#fff1d6] p-3 text-sm text-[#6b4212]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="leading-6">Le téléchargement dépend de ton abonnement et des droits du morceau.</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDownloading}
            className="h-12 rounded-full border border-black/[0.08] bg-white text-sm font-black text-black/58 transition hover:bg-black/[0.04]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!acceptedTerms || !acceptedCopyright || isDownloading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#171313] text-sm font-black text-white transition hover:opacity-92 disabled:opacity-45"
          >
            {isDownloading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <Download size={16} />
                Télécharger
              </>
            )}
          </button>
        </div>
      </UModalBody>
    </UModal>
  );
}
