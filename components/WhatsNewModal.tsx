'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  X,
  Sparkles,
  Heart,
  ListMusic,
  Play,
  MessageCircle,
  TrendingUp,
  ArrowRight,
  Music2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { UModal } from '@/components/ui/UnifiedUI';

const updates = [
  {
    icon: <Play className="w-5 h-5" />,
    title: 'Player TikTok repensé',
    desc: 'Scroll fluide, cover animée avec glow dynamique, sidebar glassmorphism, barre de progression améliorée, tags de genre et compteur de pistes.',
    accent: '#7357C6',
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: 'Likes universels',
    desc: 'Les favoris sont maintenant synchronisés partout : mini player, cartes, TikTok player et pistes IA. Un cœur, un seul état.',
    accent: '#D96D63',
  },
  {
    icon: <ListMusic className="w-5 h-5" />,
    title: 'File d\'attente améliorée',
    desc: 'Ajout rapide via le menu contextuel avec feedback toast, activation automatique, covers dans la file et lecture directe.',
    accent: '#4A9EAA',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Algorithmes plus intelligents',
    desc: 'Détection des skips, filtrage collaboratif, boost de fraîcheur, recommandations par heure du jour et sections personnalisées.',
    accent: '#C99B48',
  },
  {
    icon: <Music2 className="w-5 h-5" />,
    title: 'Nouvelles sections accueil',
    desc: 'Sélection du jour, Montée en puissance, Redécouvre, artistes similaires et découverte sociale — le feed qui te comprend.',
    accent: '#7357C6',
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: 'Commentaires redessinés',
    desc: 'Bottom sheet fluide, design glassmorphism, réponses indentées, bouton d\'envoi violet et meilleure UX mobile.',
    accent: '#D96D63',
  },
];

export default function WhatsNewModal({
  isOpen,
  onClose,
  onDontShowUntilNextUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDontShowUntilNextUpdate: () => void;
}) {
  const checkboxId = useMemo(() => 'whatsnew-dont-show', []);
  const [dontShow, setDontShow] = useState(false);

  return (
    <UModal open={isOpen} onClose={onClose} zClass="z-[400]" size="lg" showClose={false} className="!max-w-2xl !overflow-hidden !bg-syn-surface">
      <div className="relative">
        {/* ─── Header ─── */}
        <div className="relative h-32 sm:h-36 overflow-hidden bg-syn-surfaceMuted">
          <div className="absolute inset-0">
            <motion.div
              aria-hidden="true"
              className="absolute -top-16 -left-16 h-48 w-48 rounded-full blur-[60px]"
              style={{ background: 'radial-gradient(circle, rgba(115,87,198,0.16), transparent 60%)' }}
              animate={{ x: [0, 20, -10, 0], y: [0, 12, 20, 0] }}
              transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full blur-[50px]"
              style={{ background: 'radial-gradient(circle, rgba(74,158,170,0.14), transparent 60%)' }}
              animate={{ x: [0, -15, 12, 0], y: [0, -10, -18, 0] }}
              transition={{ duration: 9, ease: 'easeInOut', repeat: Infinity }}
            />
          </div>

          <div className="absolute top-3 right-3 z-10">
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="grid h-9 w-9 place-items-center rounded-full border border-syn-border bg-syn-surface/80 backdrop-blur-md text-syn-textSecondary hover:text-syn-textPrimary transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <motion.div
              className="h-14 w-14 rounded-2xl bg-syn-accent/10 border border-syn-accent/20 grid place-items-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            >
              <Sparkles className="w-6 h-6 text-syn-accent" />
            </motion.div>
            <motion.div
              className="px-3 py-1 rounded-full bg-syn-surface border border-syn-border text-[10px] font-semibold uppercase tracking-[0.15em] text-syn-textSecondary"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              Mars 2026
            </motion.div>
          </div>
        </div>

        {/* ─── Title section ─── */}
        <div className="px-6 sm:px-8 pt-5 pb-1 text-center">
          <motion.h2
            className="text-2xl sm:text-[28px] font-bold tracking-tight text-syn-textPrimary"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            Quoi de neuf ?
          </motion.h2>
          <motion.p
            className="mt-1.5 text-[13px] text-syn-textSecondary max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            Player repensé, likes synchronisés, algorithmes plus intelligents et bien plus encore.
          </motion.p>
        </div>

        {/* ─── Feature cards ─── */}
        <motion.div
          className="px-4 sm:px-6 py-4 space-y-2 max-h-[50vh] overflow-y-auto overscroll-contain"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
          }}
        >
          {updates.map((u, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, x: -12 },
                show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
              }}
              className="group relative flex items-start gap-3.5 p-3.5 rounded-2xl border border-syn-border bg-syn-surfaceMuted hover:border-black/[0.14] transition-all duration-200"
            >
              <div className="shrink-0 h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: `${u.accent}1A`, color: u.accent }}>
                {u.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-syn-textPrimary leading-tight">
                  {u.title}
                </h3>
                <p className="mt-0.5 text-[12px] text-syn-textSecondary leading-relaxed">
                  {u.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Footer ─── */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 space-y-3">
          <div className="h-px bg-syn-border" />

          <label
            htmlFor={checkboxId}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-syn-textSecondary cursor-pointer select-none hover:text-syn-textPrimary transition-colors"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-[#7357C6]"
            />
            Ne plus afficher jusqu&apos;à la prochaine mise à jour
          </label>

          <div className="flex items-center gap-2.5">
            <Link
              href="/ai-generator"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-syn-accent text-white text-sm font-semibold hover:opacity-90 transition-all active:scale-[0.98]"
            >
              Découvrir
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                if (dontShow) onDontShowUntilNextUpdate();
                else onClose();
              }}
              className="inline-flex h-11 items-center justify-center rounded-full border border-syn-border bg-syn-surfaceMuted px-6 text-sm font-semibold text-syn-textPrimary hover:bg-black/[0.05] transition-all active:scale-[0.98]"
            >
              {dontShow ? 'Masquer' : 'Fermer'}
            </button>
          </div>
        </div>
      </div>
    </UModal>
  );
}
