'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Flame } from 'lucide-react';
import type { SynauraCityData } from '@/lib/synauraCity';
import SynauraTickerBanner from '@/components/synaura/SynauraTickerBanner';
import SynauraEventCard from '@/components/synaura/SynauraEventCard';
import SynauraSectionHeader from '@/components/synaura/SynauraSectionHeader';
import SynauraPulseBadge from '@/components/synaura/SynauraPulseBadge';

export default function SynauraEventsRail({
  variant = 'home',
  className = '',
}: {
  variant?: 'home' | 'discover' | 'compact';
  className?: string;
}) {
  const [data, setData] = useState<SynauraCityData | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/city', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (active && payload?.dayKey) setData(payload);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const ticker = useMemo(() => {
    if (!data) return 'Synaura Pulse est en live · decouvre les sons et events qui bougent maintenant';
    const liveEvents = data.events.filter((event) => event.isLive).length;
    const fireTracks = data.pulse.filter((track) => track.pulse >= 78).length;
    const votes = data.events.reduce((sum, event) => sum + Number(event.totalVotes || 0), 0);
    return `Synaura Pulse est en live · ${fireTracks} sons montent · ${liveEvents} events ouverts · ${votes} votes`;
  }, [data]);

  if (variant === 'compact') {
    return (
      <SynauraTickerBanner
        className={className}
        text={ticker}
        tone="coral"
        action={<Link href="/city" className="inline-flex h-8 items-center gap-1 rounded-full bg-white/84 px-3 text-[10px] font-black text-[#171313]">Events <ArrowRight className="h-3 w-3" /></Link>}
      />
    );
  }

  if (!data) return <SynauraTickerBanner className={className} text={ticker} tone={variant === 'discover' ? 'cyan' : 'violet'} />;

  return (
    <section className={`space-y-4 ${className}`}>
      <SynauraTickerBanner text={ticker} tone={variant === 'discover' ? 'cyan' : 'violet'} action={<Link href="/city" className="inline-flex h-8 items-center gap-1 rounded-full bg-white/88 px-3 text-[10px] font-black text-[#171313]">Events <ArrowRight className="h-3 w-3" /></Link>} />
      <SynauraSectionHeader
        eyebrow="En direct"
        title={variant === 'discover' ? 'Pulse maintenant' : 'Events en cours'}
        description={variant === 'discover' ? 'Les sons et artistes qui prennent de la vitesse.' : 'Battles, challenges et nouveaux drops a vivre maintenant.'}
        href="/city"
        icon={<Flame className="h-6 w-6 text-[#ff6f61]" />}
      />
      {variant === 'discover' ? (
        <div className="synaura-no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {data.pulse.slice(0, 5).map((track) => (
            <Link key={track._id} href={`/track/${track._id}`} className="min-w-[230px] rounded-[1.35rem] border border-black/[0.07] bg-[#fffaf2]/88 p-4 shadow-[0_12px_30px_rgba(30,25,20,0.08)] transition hover:-translate-y-0.5">
              <SynauraPulseBadge state={track.pulseState} pulse={track.pulse} />
              <p className="mt-4 line-clamp-1 text-base font-black text-[#171313]">{track.title}</p>
              <p className="mt-1 line-clamp-1 text-xs font-bold text-black/45">{track.artist.artistName || track.artist.name || track.artist.username}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="synaura-no-scrollbar grid gap-3 overflow-x-auto pb-1 sm:grid-cols-2 xl:grid-cols-4">
          {data.events.slice(0, 4).map((event) => <SynauraEventCard key={event.id} event={event} compact onPrimary={() => { window.location.href = '/city'; }} />)}
        </div>
      )}
    </section>
  );
}
