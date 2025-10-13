'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { X, Sparkles, Crown, Cloud, Bot } from 'lucide-react';
import React from 'react';

export default function WhatsNewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 w-full sm:w-[94vw] max-w-3xl rounded-t-3xl sm:rounded-[28px] border border-[var(--border)] bg-[var(--surface)]/95 overflow-hidden"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-28 sm:h-36 w-full bg-[radial-gradient(80%_120%_at_0%_0%,rgba(124,58,237,0.35),transparent),radial-gradient(80%_120%_at_100%_100%,rgba(34,211,238,0.25),transparent)]">
              <div className="absolute top-3 right-3">
                <button
                  aria-label="Fermer"
                  onClick={onClose}
                  className="relative inline-flex items-center justify-center rounded-full p-2.5 text-white/90 hover:bg-white/10 border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="inline-flex items-center justify-center rounded-full bg-white/10 p-3 text-white/90">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="px-6 sm:px-8 -mt-10 text-center">
              <h2 className="text-3xl sm:text-[40px] font-light text-white/90 font-serif">Nouveautés Synaura</h2>
              <p className="mt-2 text-white/70 text-sm">Abonnements repensés, Crédits IA, et Espace Météo pro</p>
            </div>

            {/* Content */}
            <div className="px-5 sm:px-8 py-5 sm:py-6 grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-3 max-h-[70vh] overflow-y-auto">
              <FeatureCard
                icon={<Crown className="w-5 h-5" />}
                title="Abonnements par crédits"
                desc="Chaque plan inclut des crédits mensuels (≈ générations). Achat de packs possible."
                href="/subscriptions"
                cta="Voir les plans"
              />
              <FeatureCard
                icon={<Bot className="w-5 h-5" />}
                title="Génération IA améliorée"
                desc="Flux plus stable, crédits débités automatiquement, et prévisualisation plus rapide."
                href="/ai-generator"
                cta="Générer"
              />
              <FeatureCard
                icon={<Cloud className="w-5 h-5" />}
                title="Espace Météo Alertemps"
                desc="Bulletin pro actualisé, visible publiquement. Partenariat avec Cieux Instables."
                href="/meteo"
                cta="Voir la météo"
              />
            </div>

            {/* Footer actions */}
            <div className="px-5 sm:px-8 pb-5 sm:pb-6 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center">
              <Link
                href="/ai-generator"
                className="inline-flex items-center justify-center px-5 py-3 rounded-full text-black bg-white hover:opacity-90 font-semibold w-full sm:w-auto"
              >
                Découvrir maintenant
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center px-5 py-3 rounded-full text-white/90 border border-white/15 hover:bg-white/10 w-full sm:w-auto"
              >
                Ne plus afficher
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeatureCard({ icon, title, desc, href, cta }: { icon: React.ReactNode; title: string; desc: string; href: string; cta: string; }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 sm:p-5 flex flex-col gap-3 text-white/85"
    >
      <div className="inline-flex items-center gap-2 text-white/90">
        <span className="inline-flex items-center justify-center rounded-full bg-white/10 p-2">{icon}</span>
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">{desc}</p>
      <Link href={href} className="mt-auto inline-flex items-center justify-center px-3 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:opacity-90">
        {cta}
      </Link>
    </motion.div>
  );
}


