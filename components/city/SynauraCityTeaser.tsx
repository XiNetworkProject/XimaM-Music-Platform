'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, ArrowRight, RadioTower, Sparkles, Trophy } from 'lucide-react';
import type { SynauraCityData } from '@/lib/synauraCity';

export default function SynauraCityTeaser() {
  const [city, setCity] = useState<SynauraCityData | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/city', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data?.dayKey) setCity(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const pulse = city?.pulse?.[0];
  return (
    <Link
      href="/city"
      className="group relative mb-4 block overflow-hidden rounded-[1.6rem] border border-black/[0.09] bg-[#171313] px-4 py-4 text-[#fffaf2] shadow-[0_20px_60px_rgba(23,19,19,0.18)] sm:rounded-[2rem] sm:px-6 sm:py-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,75,122,0.30),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(0,194,203,0.24),transparent_34%),linear-gradient(120deg,transparent,rgba(124,92,255,0.14))]" />
      <div className="relative flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/[0.15]">
          <RadioTower className="h-6 w-6 text-[#7ef2ed]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7ef2ed]">Synaura Pulse est en live</span>
            {pulse ? <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-black">Pulse {pulse.pulse}%</span> : null}
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{city?.cityMood?.title || 'Chaque jour, quelque chose se passe.'}</h2>
          <p className="mt-1 max-w-2xl text-xs font-bold text-white/[0.54] sm:text-sm">
            Nouveaux talents, Pulse, battles, challenges et temps forts dans un seul espace vivant.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black text-white/[0.66]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1.5"><Activity className="h-3 w-3" /> Pulse</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1.5"><Sparkles className="h-3 w-3" /> Radar</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1.5"><Trophy className="h-3 w-3" /> Awards</span>
          </div>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fffaf2] text-[#171313] transition group-hover:translate-x-1">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
