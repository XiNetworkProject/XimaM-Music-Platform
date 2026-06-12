'use client';

import { CalendarDays, Clock3, Gift, RadioTower, Sparkles, Trophy, Users, Vote, Zap } from 'lucide-react';
import type { CityEvent } from '@/lib/synauraCity';
import { SynauraButton, SynauraGhostButton } from '@/components/synaura/SynauraButton';

const icons = {
  battle: Vote,
  challenge: Zap,
  friday_drop: RadioTower,
  seasonal: Sparkles,
} as const;

function remainingLabel(endsAt?: string) {
  if (!endsAt) return 'En cours';
  const delta = new Date(endsAt).getTime() - Date.now();
  if (delta <= 0) return 'Termine';
  const hours = Math.max(1, Math.round(delta / 3_600_000));
  return hours < 24 ? `${hours} h restantes` : `${Math.ceil(hours / 24)} j restants`;
}

export default function SynauraEventCard({
  event,
  onPrimary,
  onSecondary,
  compact = false,
}: {
  event: CityEvent;
  onPrimary?: (event: CityEvent) => void;
  onSecondary?: (event: CityEvent) => void;
  compact?: boolean;
}) {
  const Icon = icons[event.kind] || CalendarDays;
  const primaryLabel = event.detailCta?.label || (event.kind === 'battle' ? 'Voter' : 'Participer');

  return (
    <article
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-[1.6rem] border border-black/[0.07] bg-[#fffaf2]/92 shadow-[0_16px_42px_rgba(30,25,20,0.10)] ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
      style={{ backgroundImage: `linear-gradient(145deg, ${event.accent || '#7c5cff'}2b, rgba(255,250,242,.94) 58%)` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] bg-[#171313] text-white shadow-[0_12px_26px_rgba(23,19,19,0.17)]">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.12em] ${event.isLive ? 'bg-[#2bc96f]/14 text-[#168746]' : 'bg-black/[0.055] text-black/48'}`}>
          <span className={`h-2 w-2 rounded-full ${event.isLive ? 'animate-pulse bg-[#2bc96f]' : 'bg-black/30'}`} />
          {event.isLive ? 'En live' : event.status || 'A venir'}
        </span>
      </div>

      <div className={compact ? 'mt-4' : 'mt-6'}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/42">{event.subtitle || 'Event Synaura'}</p>
        <h3 className={`${compact ? 'mt-1 text-xl' : 'mt-2 text-2xl sm:text-3xl'} font-black tracking-tight text-[#171313]`}>{event.title}</h3>
        <p className={`mt-2 font-bold text-black/52 ${compact ? 'line-clamp-2 text-xs' : 'line-clamp-3 text-sm'}`}>{event.description}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.09em] text-black/50">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/72 px-3 py-2"><Clock3 className="h-3.5 w-3.5" /> {remainingLabel(event.endsAt)}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/72 px-3 py-2"><Users className="h-3.5 w-3.5" /> {event.participationCount || 0} participants</span>
        {event.kind === 'battle' ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/72 px-3 py-2"><Vote className="h-3.5 w-3.5" /> {event.totalVotes || 0} votes</span> : null}
      </div>

      {event.reward ? (
        <div className="mt-4 flex items-center gap-2 rounded-[1rem] bg-white/56 px-3 py-2.5 text-xs font-bold text-black/55">
          {event.reward.kind === 'badge' ? <Trophy className="h-4 w-4 text-[#7c5cff]" /> : <Gift className="h-4 w-4 text-[#ff6f61]" />}
          <span className="line-clamp-1">{event.reward.title}</span>
        </div>
      ) : null}

      <div className="mt-auto flex gap-2 pt-5">
        <SynauraButton className="flex-1 px-4" onClick={() => onPrimary?.(event)} disabled={!onPrimary}>
          {primaryLabel}
        </SynauraButton>
        {onSecondary ? <SynauraGhostButton className="px-4" onClick={() => onSecondary(event)}>Voir</SynauraGhostButton> : null}
      </div>
    </article>
  );
}
