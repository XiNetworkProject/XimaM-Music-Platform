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
  Zap,
  Music2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { UModal, UModalBody, UButton } from '@/components/ui/UnifiedUI';

const updates = [
  {
    icon: <Play className="w-5 h-5" />,
    title: 'Player TikTok repensé',
    desc: 'Scroll fluide, cover animée avec glow dynamique, sidebar glassmorphism, barre de progression améliorée, tags de genre et compteur de pistes.',
    color: 'from-violet-500/20 to-indigo-500/20',
    borderColor: 'border-violet-400/15',
    iconBg: 'bg-violet-500/10 text-violet-300',
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: 'Likes universels',
    desc: 'Les favoris sont maintenant synchronisés partout : mini player, cartes, TikTok player et pistes IA. Un cœur, un seul état.',
    color: 'from-rose-500/20 to-pink-500/20',
    borderColor: 'border-rose-400/15',
    iconBg: 'bg-rose-500/10 text-rose-300',
  },
  {
    icon: <ListMusic className="w-5 h-5" />,
    title: 'File d\'attente améliorée',
    desc: 'Ajout rapide via le menu contextuel avec feedback toast, activation automatique, covers dans la file et lecture directe.',
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-400/15',
    iconBg: 'bg-blue-500/10 text-blue-300',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Algorithmes plus intelligents',
    desc: 'Détection des skips, filtrage collaboratif, boost de fraîcheur, recommandations par heure du jour et sections personnalisées.',
    color: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-400/15',
    iconBg: 'bg-emerald-500/10 text-emerald-300',
  },
  {
    icon: <Music2 className="w-5 h-5" />,
    title: 'Nouvelles sections accueil',
    desc: 'Sélection du jour, Montée en puissance, Redécouvre, artistes similaires et découverte sociale — le feed qui te comprend.',
    color: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-400/15',
    iconBg: 'bg-amber-500/10 text-amber-300',
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: 'Commentaires redessinés',
    desc: 'Bottom sheet fluide, design glassmorphism, réponses indentées, bouton d\'envoi violet et meilleure UX mobile.',
    color: 'from-fuchsia-500/20 to-purple-500/20',
    borderColor: 'border-fuchsia-400/15',
    iconBg: 'bg-fuchsia-500/10 text-fuchsia-300',
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
    <UModal open={isOpen} onClose={onClose} zClass="z-[400]" size="lg" showClose={false} className="!max-w-2xl !overflow-hidden">
      <div className="relative">
        {/* ─── Header ─── */}
        <div className="relative h-32 sm:h-36 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-blue-600/15" />
            <motion.div
              aria-hidden="true"
              className="absolute -top-16 -left-16 h-48 w-48 rounded-full blur-[60px]"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4), transparent 60%)' }}
              animate={{ x: [0, 20, -10, 0], y: [0, 12, 20, 0] }}
              transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full blur-[50px]"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)' }}
              animate={{ x: [0, -15, 12, 0], y: [0, -10, -18, 0] }}
              transition={{ duration: 9, ease: 'easeInOut', repeat: Infinity }}
            />
          </div>

          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          <div className="absolute top-3 right-3 z-10">
            <UButton variant="secondary" size="icon" onClick={onClose} className="!bg-black/30 backdrop-blur-md !border-white/[0.08]">
              <X className="w-4 h-4" />
            </UButton>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <motion.div
              className="h-14 w-14 rounded-2xl bg-white/[0.06] border border-white/[0.1] grid place-items-center backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.2)]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            >
              <Sparkles className="w-6 h-6 text-violet-300" />
            </motion.div>
            <motion.div
              className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50"
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
            className="text-2xl sm:text-[28px] font-bold tracking-tight text-white"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            Quoi de neuf ?
          </motion.h2>
          <motion.p
            className="mt-1.5 text-[13px] text-white/40 max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            Player repensé, likes synchronisés, algorithmes plus intelligents et bien plus encore.
          </motion.p>
        </div>

        {/* ─── Feature cards ─── */}
        <motion.div
          className="px-4 sm:px-6 py-4 space-y-2 max-h-[50vh] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/5"
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
              className={`group relative flex items-start gap-3.5 p-3.5 rounded-2xl border ${u.borderColor} bg-gradient-to-r ${u.color} hover:border-white/[0.12] transition-all duration-200`}
            >
              <div className={`shrink-0 h-10 w-10 rounded-xl ${u.iconBg} border border-white/[0.06] grid place-items-center`}>
                {u.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-white/90 leading-tight">
                  {u.title}
                </h3>
                <p className="mt-0.5 text-[12px] text-white/45 leading-relaxed">
                  {u.desc}
                </p>
              </div>
              <Zap className="shrink-0 w-3.5 h-3.5 text-white/10 mt-1 group-hover:text-white/20 transition-colors" />
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Footer ─── */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 space-y-3">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          <label
            htmlFor={checkboxId}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-white/40 cursor-pointer select-none hover:text-white/50 transition-colors"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-violet-500"
            />
            Ne plus afficher jusqu&apos;à la prochaine mise à jour
          </label>

          <div className="flex items-center gap-2.5">
            <Link
              href="/ai-generator"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all active:scale-[0.98]"
            >
              Découvrir
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <UButton
              variant="secondary"
              size="lg"
              onClick={() => {
                if (dontShow) onDontShowUntilNextUpdate();
                else onClose();
              }}
            >
              {dontShow ? 'Masquer' : 'Fermer'}
            </UButton>
          </div>
        </div>
      </div>
    </UModal>
  );
}
