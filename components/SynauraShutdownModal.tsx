'use client';

import Link from 'next/link';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UModal, UModalBody, UButton } from '@/components/ui/UnifiedUI';
import {
  SHUTDOWN_END_DATE_LABEL,
  SHUTDOWN_ANNOUNCEMENT_LABEL,
  formatShutdownCountdown,
  getMsUntilShutdownEnd,
} from '@/lib/synauraShutdown';

export default function SynauraShutdownModal({
  isOpen,
  onClose,
  onDismiss,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const checkboxId = useMemo(() => 'shutdown-notice-dismiss', []);
  const [dontShow, setDontShow] = useState(false);
  const msLeft = getMsUntilShutdownEnd();
  const cd = formatShutdownCountdown(msLeft);

  const handleClose = () => {
    if (dontShow) onDismiss();
    onClose();
  };

  return (
    <UModal open={isOpen} onClose={handleClose} zClass="z-[500]" size="lg" showClose={false} className="!max-w-2xl !overflow-hidden">
      <div className="relative">
        <div className="relative h-28 sm:h-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 via-rose-950/30 to-[#0a0a0e]" />
          <div className="absolute top-3 right-3 z-10">
            <UButton variant="secondary" size="icon" onClick={handleClose} className="!bg-black/30 backdrop-blur-md !border-white/[0.08]">
              <X className="w-4 h-4" />
            </UButton>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30">
              <AlertTriangle className="w-4 h-4 text-red-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-200">Annonce officielle</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Synaura ferme définitivement</h2>
          </div>
        </div>

        <UModalBody className="!pt-5 space-y-4">
          <p className="text-sm text-white/70 leading-relaxed">
            Publié le <strong className="text-white">{SHUTDOWN_ANNOUNCEMENT_LABEL}</strong> — En tant qu&apos;éditeur
            de la plateforme Synaura (Maxime VERMEULEN, auto-entrepreneur), je vous informe de l&apos;arrêt
            définitif du service.
          </p>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3 text-sm text-white/60">
            <p>
              <strong className="text-white/90">Motif :</strong> Synaura ne parvient plus à couvrir les frais
              d&apos;exploitation engagés (hébergement, stockage, APIs, maintenance) ni à développer une base
              d&apos;utilisateurs suffisante pour assurer la viabilité du projet. Je suis contraint d&apos;interrompre
              le service.
            </p>
            <p>
              <strong className="text-white/90">Date limite :</strong> le{' '}
              <strong className="text-red-200">{SHUTDOWN_END_DATE_LABEL} à 23h59</strong> (heure de Paris).
              Passé ce délai d&apos;un mois, <strong className="text-white/80">plus rien ne sera accessible</strong>{' '}
              : comptes, musiques, messagerie, studio IA, abonnements et API.
            </p>
            <p>
              <strong className="text-white/90">Avenir :</strong> une relance pourrait être envisagée un jour,
              sans aucune garantie ni engagement de ma part.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Fin d&apos;accès dans
              </p>
              <p className="text-2xl font-black tabular-nums text-white">
                {cd.days}j {String(cd.hours).padStart(2, '0')}h {String(cd.minutes).padStart(2, '0')}m
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/fermeture"
              onClick={handleClose}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition"
            >
              Annonce complète et mentions légales
            </Link>
            <UButton variant="secondary" onClick={handleClose} className="flex-1">
              J&apos;ai compris
            </UButton>
          </div>

          <label htmlFor={checkboxId} className="flex items-start gap-2.5 cursor-pointer text-xs text-white/40">
            <input
              id={checkboxId}
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="mt-0.5 rounded border-white/20"
            />
            Ne plus afficher cette fenêtre (l&apos;annonce reste visible sur le site)
          </label>
        </UModalBody>
      </div>
    </UModal>
  );
}
