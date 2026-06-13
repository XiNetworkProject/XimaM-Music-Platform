'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Bell, Play, Vote } from 'lucide-react';
import TrackCover from '@/components/TrackCover';
import type { CityVoteSession } from '@/lib/synauraCity';
import SynauraBattleDuel from '@/components/synaura/SynauraBattleDuel';

function durationLabel(target?: string) {
  const delta = Math.max(0, new Date(target || 0).getTime() - Date.now());
  const hours = Math.floor(delta / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  const seconds = Math.floor((delta % 60_000) / 1_000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function SynauraCountdownBanner({
  current,
  next,
  onOpen,
  onNotify,
}: {
  current: CityVoteSession | null;
  next: CityVoteSession | null;
  onOpen?: () => void;
  onNotify?: () => void;
}) {
  const session = current || next;
  const [remaining, setRemaining] = useState(() => durationLabel(current?.endsAt || next?.startsAt));

  useEffect(() => {
    const update = () => setRemaining(durationLabel(current?.endsAt || next?.startsAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [current?.endsAt, next?.startsAt]);

  const covers = useMemo(() => (session?.tracks || []).slice(0, 3), [session?.tracks]);
  if (!session) return null;

  return (
    <section className="relative overflow-hidden rounded-[1.7rem] border border-black/[0.07] bg-[#171313] px-5 py-6 text-white shadow-[0_20px_65px_rgba(23,19,19,0.18)] sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_12%_20%,rgba(255,111,97,.34),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(124,92,255,.40),transparent_38%),radial-gradient(circle_at_62%_100%,rgba(0,194,203,.24),transparent_34%)]" />
      <motion.div
        className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full border border-white/10"
        animate={{ scale: [0.82, 1.16, 0.82], opacity: [0.18, 0.05, 0.18] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className="grid h-11 w-11 place-items-center rounded-[1rem] bg-white">
              <Image src="/brand/2026/synaura-symbol-2026.png" alt="" width={36} height={36} className="h-9 w-9 object-contain" unoptimized />
            </motion.span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">{current ? 'Vote en cours' : 'Prochain vote dans'}</p>
              <p className="mt-0.5 text-sm font-black text-white/88">{session.title}</p>
            </div>
          </div>
          <p className="mt-5 font-mono text-4xl font-black tracking-normal sm:text-6xl">{remaining}</p>
          <p className="mt-2 max-w-xl text-sm font-bold text-white/52">
            {current ? 'Écoute les participants et choisis le son qui mérite la vitrine.' : 'Les sons sélectionnés seront révélés à l’ouverture de la session.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={onOpen} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-xs font-black text-[#171313] transition hover:scale-[1.02]">
              {current ? <Vote className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {current ? 'Écouter et voter' : 'Voir les participants'}
            </button>
            {!current ? (
              <button type="button" onClick={onNotify} className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-xs font-black text-white transition hover:bg-white/16">
                <Bell className="h-4 w-4" /> Me prévenir
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-32 lg:min-w-72">
          {covers.length >= 2 ? <SynauraBattleDuel event={session} compact /> : covers.map((track) => <TrackCover key={track._id} trackId={track._id} src={track.coverUrl} title={track.title} className="h-28 w-28 rounded-[1.35rem] object-cover" />)}
        </div>
      </div>
    </section>
  );
}
