'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Music2, Sparkles, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import SynauraLogo from '@/components/brand/SynauraLogo';

export default function EntryFrame({ eyebrow, title, description, children, compact = false }: { eyebrow: string; title: string; description: string; children: ReactNode; compact?: boolean }) {
  const reduced = Boolean(useReducedMotion());
  return (
    <main className="grid w-full max-w-6xl gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <motion.aside
        initial={{ opacity: 0, x: reduced ? 0 : -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduced ? 0.18 : 0.5, ease: 'easeOut' }}
        className="relative hidden min-h-[640px] overflow-hidden rounded-[2.2rem] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] p-7 shadow-[var(--syn-shadow-high)] backdrop-blur-2xl lg:flex lg:flex-col"
      >
        <div className="pointer-events-none absolute -left-28 -top-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(217,109,99,.45),rgba(115,87,198,.24)_42%,transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-36 -right-28 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(74,158,170,.38),rgba(115,87,198,.16)_44%,transparent_70%)]" />
        <Link href="/" className="relative z-10 inline-flex items-center gap-3 self-start rounded-full pr-3 font-black">
          <span className="grid h-12 w-12 place-items-center overflow-visible rounded-2xl border border-[var(--syn-border)] bg-[var(--syn-surface)]"><SynauraLogo size={46} decorative /></span>
          <span>Synaura</span>
        </Link>
        <div className="relative z-10 my-auto py-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--syn-accent-coral)]">Entrer dans Synaura</p>
          <h1 className="mt-4 max-w-lg text-5xl font-black leading-[0.94] tracking-[-0.055em]">Ton univers musical est juste derrière.</h1>
          <p className="mt-5 max-w-md text-base font-semibold leading-relaxed text-[var(--syn-text-secondary)]">Une écoute vivante, des créateurs autour de chaque son, et un espace pour faire naître les tiens.</p>
          <div className="relative mt-10 overflow-hidden rounded-[1.8rem] border border-[var(--syn-border)] bg-[#09090c] p-5 text-white shadow-[var(--syn-shadow-high)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(217,109,99,.34),transparent_34%),radial-gradient(circle_at_82%_78%,rgba(74,158,170,.26),transparent_38%)]" />
            <div className="relative flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><Music2 className="h-5 w-5" /></span><span><strong className="block">Une onde circule</strong><span className="text-xs text-white/52">et les réactions apparaissent au bon moment</span></span></div>
            <div className="relative mt-6 flex h-16 items-center gap-1" aria-hidden>{[24,46,32,58,38,66,42,54,30,62,36,48,28,56,34,44].map((height, index) => <motion.span key={index} className="flex-1 rounded-full bg-gradient-to-t from-[#4A9EAA] via-[#7357C6] to-[#D96D63]" style={{ height }} animate={reduced ? undefined : { scaleY: [0.72, 1, 0.72] }} transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.04 }} />)}</div>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-2 text-xs font-black text-[var(--syn-text-secondary)]">
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[var(--syn-accent)]" /> Créateurs</span>
          <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-[var(--syn-accent-blue)]" /> Moments</span>
          <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[var(--syn-accent-coral)]" /> Création</span>
        </div>
      </motion.aside>

      <motion.section
        initial={{ opacity: 0, y: reduced ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.18 : 0.42, ease: 'easeOut' }}
        className={`relative overflow-hidden rounded-[2.2rem] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] p-5 shadow-[var(--syn-shadow-high)] backdrop-blur-2xl sm:p-8 ${compact ? '' : 'lg:min-h-[640px]'}`}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(115,87,198,.22),transparent_68%)]" />
        <div className="relative z-10 flex h-full flex-col">
          <div className="mb-7 flex items-center justify-between gap-3 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 font-black"><SynauraLogo size={38} decorative /> Synaura</Link>
            <Link href="/" className="syn-interactive inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft)]"><ArrowLeft className="h-3.5 w-3.5" /> Découvrir</Link>
          </div>
          <div className="mb-7">
            <p className="text-xs font-black uppercase tracking-[0.19em] text-[var(--syn-accent-coral)]">{eyebrow}</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{title}</h2>
            <p className="mt-2 max-w-lg text-sm font-semibold leading-relaxed text-[var(--syn-text-secondary)]">{description}</p>
          </div>
          {children}
        </div>
      </motion.section>
    </main>
  );
}
