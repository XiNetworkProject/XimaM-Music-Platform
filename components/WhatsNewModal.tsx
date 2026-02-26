'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { X, Sparkles, Crown, Cloud, Bot } from 'lucide-react';
import React, { useMemo, useState } from 'react';

const gridVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 260, damping: 22, mass: 0.7 },
  },
};

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 w-full sm:w-[94vw] max-w-3xl rounded-t-3xl sm:rounded-[28px] border border-border-secondary bg-[var(--surface)]/95 shadow-2xl overflow-hidden"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-28 sm:h-36 w-full bg-[#121212] overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(70%_110%_at_18%_28%,rgba(110,86,207,0.38),transparent_62%),radial-gradient(80%_110%_at_85%_78%,rgba(34,211,238,0.18),transparent_65%),radial-gradient(70%_100%_at_20%_92%,rgba(139,92,246,0.18),transparent_65%)]" />
              {/* Aurora animée (subtile) */}
              <motion.div
                aria-hidden="true"
                className="absolute -top-10 -left-10 h-48 w-48 rounded-full blur-3xl opacity-35"
                style={{ background: 'radial-gradient(circle at 30% 30%, rgba(34,211,238,0.55), transparent 60%)' }}
                animate={{ x: [0, 18, -8, 0], y: [0, 10, 16, 0], opacity: [0.26, 0.38, 0.30, 0.26] }}
                transition={{ duration: 7.5, ease: 'easeInOut', repeat: Infinity }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute -bottom-14 -right-16 h-56 w-56 rounded-full blur-3xl opacity-35"
                style={{ background: 'radial-gradient(circle at 60% 40%, rgba(110,86,207,0.65), transparent 62%)' }}
                animate={{ x: [0, -14, 10, 0], y: [0, -10, -18, 0], opacity: [0.26, 0.40, 0.32, 0.26] }}
                transition={{ duration: 8.5, ease: 'easeInOut', repeat: Infinity }}
              />
              <div className="absolute top-3 right-3">
                <button
                  aria-label="Fermer"
                  onClick={onClose}
                  className="relative inline-flex items-center justify-center rounded-full p-2.5 text-white/90 hover:bg-white/10 border border-white/10 bg-black/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 p-3 text-accent-brand"
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.08, duration: 0.25 }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
              </div>
            </div>

            {/* Title */}
            <div className="px-6 sm:px-8 -mt-10 text-center">
              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] tracking-widest uppercase text-white/70"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, duration: 0.22 }}
              >
                Nouveautés
                <span className="h-1 w-1 rounded-full bg-white/30" />
                Synaura
              </motion.div>
              <motion.h2
                className="mt-3 text-3xl sm:text-[40px] font-semibold tracking-tight text-white/90"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.10, duration: 0.24 }}
              >
                Nouveautés Synaura
              </motion.h2>
              <motion.p
                className="mt-2 text-white/60 text-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.13, duration: 0.24 }}
              >
                Nouveau Studio, création & partage, et remix — en progression constante.
              </motion.p>
            </div>

            {/* Content */}
            <motion.div
              className="px-5 sm:px-8 py-5 sm:py-6 grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-3 max-h-[70vh] overflow-y-auto"
              variants={gridVariants}
              initial="hidden"
              animate="show"
            >
              <FeatureCard
                icon={<Crown className="w-5 h-5" />}
                title="Nouveau Studio"
                desc="En cours de développement, mais déjà presque entièrement fonctionnel. Timeline, pré-écoute et outils de prod."
                href="/studio"
                cta="Ouvrir le Studio"
                index={0}
              />
              <FeatureCard
                icon={<Bot className="w-5 h-5" />}
                title="Créer & partager tes musiques"
                desc="Crée des tracks, publie-les et partage-les à la communauté. Tout est pensé pour passer de l’idée au partage."
                href="/upload"
                cta="Partager"
                index={1}
              />
              <FeatureCard
                icon={<Cloud className="w-5 h-5" />}
                title="Remixer des musiques"
                desc="Remix rapide depuis le Studio : variations, arrangements et nouvelles vibes, sans repartir de zéro."
                href="/studio"
                cta="Remixer"
                index={2}
              />
            </motion.div>

            {/* Footer actions */}
            <div className="px-5 sm:px-8 pb-5 sm:pb-6 flex flex-col items-stretch gap-3 sm:gap-4">
              <label
                htmlFor={checkboxId}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75 cursor-pointer select-none"
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--accent-brand)]"
                />
                <span className="leading-snug">
                  Ne plus afficher <span className="text-white/90 font-semibold">jusqu&apos;à la prochaine mise à jour</span>
                </span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center">
              <Link
                href="/ai-generator"
                className="inline-flex items-center justify-center px-5 py-3 rounded-full text-white bg-accent-brand hover:opacity-90 font-semibold w-full sm:w-auto"
              >
                Découvrir maintenant
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (dontShow) onDontShowUntilNextUpdate();
                  else onClose();
                }}
                className="inline-flex items-center justify-center px-5 py-3 rounded-full text-white/80 border border-white/10 hover:bg-white/5 w-full sm:w-auto"
              >
                {dontShow ? 'Ne plus afficher' : 'Fermer'}
              </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  href,
  cta,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
  cta: string;
  index: number;
}) {
  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.7 }}
      className="group relative rounded-2xl border border-border-secondary bg-[var(--surface-2)] p-4 sm:p-5 flex flex-col gap-3 text-white/85 overflow-hidden transition-colors hover:border-white/15"
    >
      {/* Fond au survol (cadré) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div
          className="absolute inset-0 rounded-2xl blur-xl"
          style={{
            background:
              'radial-gradient(60% 60% at 22% 26%, rgba(110,86,207,0.18), transparent 62%), radial-gradient(55% 55% at 78% 72%, rgba(34,211,238,0.12), transparent 66%)',
          }}
        />
        <div className="absolute inset-0 rounded-2xl bg-white/[0.02]" />
      </div>

      <div className="relative z-10 h-1 w-full rounded-full bg-[linear-gradient(90deg,rgba(110,86,207,0.95),rgba(139,92,246,0.75),rgba(34,211,238,0.55))]" />
      <div className="relative z-10 flex items-start gap-2 text-white/90 min-w-0 text-left">
        <motion.span
          className="mt-0.5 inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 p-2 text-accent-brand shrink-0"
          animate={{ y: [0, -1.2, 0] }}
          transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity, delay: 0.2 + index * 0.15 }}
        >
          {icon}
        </motion.span>
        <span className="min-w-0 font-semibold leading-snug tracking-tight text-[15px] text-white/90">
          {title}
        </span>
      </div>
      <p className="relative z-10 text-sm text-white/60 leading-snug text-left">{desc}</p>
      <Link
        href={href}
        className="relative z-10 mt-auto inline-flex items-center justify-center px-3 py-2 rounded-full border border-white/10 bg-white/5 text-white/90 text-sm font-semibold hover:bg-white/10 transition"
      >
        {cta}
      </Link>
    </motion.div>
  );
}


