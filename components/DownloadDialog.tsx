'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, AlertTriangle, CheckCircle, FileText, Shield, Copyright } from 'lucide-react';
import toast from 'react-hot-toast';

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
      toast.error('Veuillez accepter toutes les conditions');
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="relative w-full max-w-md mx-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
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
              <button
                onClick={handleClose}
                disabled={isDownloading}
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
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
              {/* Terms of Use */}
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

              {/* Copyright */}
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
              <button
                onClick={handleClose}
                disabled={isDownloading}
                className="flex-1 px-4 py-3 rounded-xl text-white/70 bg-white/10 border border-white/20 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={!acceptedTerms || !acceptedCopyright || isDownloading}
                className="flex-1 px-4 py-3 rounded-xl text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Téléchargement...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Télécharger</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
