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
      <UModalBody>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <Download size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Téléchargement</h2>
              <p className="text-sm text-white/70">Conditions d'utilisation</p>
            </div>
          </div>
          <UButton variant="ghost" size="icon" onClick={handleClose} disabled={isDownloading}>
            <X size={20} />
          </UButton>
        </div>

        {/* Track Info */}
        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <FileText size={16} className="text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{trackTitle}</h3>
              <p className="text-sm text-white/70">par {artistName}</p>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 mt-0.5">
              <Shield size={16} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  disabled={isDownloading}
                  className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500 focus:ring-2 disabled:opacity-50"
                />
                <div className="text-sm text-white/90">
                  <span className="font-medium">Conditions d'utilisation</span>
                  <p className="text-white/70 mt-1">
                    J'accepte d'utiliser cette musique uniquement à des fins personnelles et non commerciales. 
                    Je ne redistribuerai pas ce fichier sans autorisation.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 mt-0.5">
              <Copyright size={16} className="text-orange-400" />
            </div>
            <div className="flex-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedCopyright}
                  onChange={(e) => setAcceptedCopyright(e.target.checked)}
                  disabled={isDownloading}
                  className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500 focus:ring-2 disabled:opacity-50"
                />
                <div className="text-sm text-white/90">
                  <span className="font-medium">Respect du droit d'auteur</span>
                  <p className="text-white/70 mt-1">
                    Je reconnais que cette œuvre est protégée par le droit d'auteur et m'engage à respecter 
                    les droits de l'artiste et de Synaura.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-200">
              <p className="font-medium">Important</p>
              <p className="text-yellow-300/80 mt-1">
                Le téléchargement est réservé aux abonnés Pro et Enterprise. 
                Toute utilisation commerciale nécessite une autorisation préalable.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <UButton
            variant="secondary"
            size="lg"
            fullWidth
            onClick={handleClose}
            disabled={isDownloading}
          >
            Annuler
          </UButton>
          <UButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleConfirm}
            disabled={!acceptedTerms || !acceptedCopyright || isDownloading}
          >
            {isDownloading ? (
              <>
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <Download size={16} />
                Télécharger
              </>
            )}
          </UButton>
        </div>
      </UModalBody>
    </UModal>
  );
}
