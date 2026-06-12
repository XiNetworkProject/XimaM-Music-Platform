'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Check, Sparkles, Trophy } from 'lucide-react';
import type { CityEvent, SynauraCityData } from '@/lib/synauraCity';

export default function SynauraEventEntryPanel({
  selectedEventId,
  onChange,
  dark = false,
}: {
  selectedEventId: string | null;
  onChange: (eventId: string | null) => void;
  dark?: boolean;
}) {
  const [events, setEvents] = useState<CityEvent[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/city', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: SynauraCityData | null) => {
        if (!active || !payload?.events) return;
        setEvents(payload.events.filter((event) => event.kind !== 'battle' && event.canParticipate !== false && !event.isEnded));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const panelClass = dark
    ? 'border-white/[0.09] bg-white/[0.045] text-white'
    : 'border-black/[0.07] bg-[#fffaf2]/82 text-[#171313]';
  const mutedClass = dark ? 'text-white/42' : 'text-black/42';

  return (
    <section className={`rounded-[1.35rem] border p-3 sm:p-4 ${panelClass}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[0.9rem] ${dark ? 'bg-white/10 text-[#ff9a90]' : 'bg-[#7c5cff]/12 text-[#5b3fe8]'}`}>
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ff6f61]">Visibilite Events</p>
          <h3 className="mt-1 text-base font-black">Publier dans un event</h3>
          <p className={`mt-1 text-xs font-bold ${mutedClass}`}>Le premier titre de cette sortie sera inscrit automatiquement apres publication.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex min-h-12 items-center gap-3 rounded-[1rem] px-3 text-left transition ${selectedEventId === null ? dark ? 'bg-white text-[#171313]' : 'bg-[#171313] text-white' : dark ? 'bg-white/[0.055] text-white/62 hover:bg-white/[0.09]' : 'bg-black/[0.04] text-black/58 hover:bg-black/[0.07]'}`}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 text-xs font-black">Publier normalement</span>
          {selectedEventId === null ? <Check className="h-4 w-4 shrink-0" /> : null}
        </button>
        {events.map((event) => {
          const selected = selectedEventId === event.id;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onChange(event.id)}
              className={`flex min-h-14 items-center gap-3 rounded-[1rem] px-3 text-left transition ${selected ? dark ? 'bg-[#ff9a90] text-[#171313]' : 'bg-[#7c5cff] text-white' : dark ? 'bg-white/[0.055] text-white/62 hover:bg-white/[0.09]' : 'bg-black/[0.04] text-black/58 hover:bg-black/[0.07]'}`}
            >
              <Trophy className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-black">{event.title}</span>
                <span className={`mt-0.5 block truncate text-[10px] font-bold ${selected ? 'opacity-70' : mutedClass}`}>{event.reward?.title || event.challengeTag || event.subtitle}</span>
              </span>
              {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
