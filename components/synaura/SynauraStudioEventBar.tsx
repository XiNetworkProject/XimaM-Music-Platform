'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Sparkles, Trophy } from 'lucide-react';
import type { CityEvent, SynauraCityData } from '@/lib/synauraCity';
import { notify } from '@/components/NotificationCenter';

export default function SynauraStudioEventBar({
  trackId,
  onApply,
}: {
  trackId?: string | null;
  onApply: (event: CityEvent) => void;
}) {
  const [event, setEvent] = useState<CityEvent | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/city', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: SynauraCityData | null) => {
        if (!active || !payload?.events) return;
        setEvent(payload.events.find((item) => item.kind === 'challenge' && item.canParticipate !== false && !item.isEnded)
          || payload.events.find((item) => item.kind !== 'battle' && item.canParticipate !== false && !item.isEnded)
          || null);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => setJoined(false), [trackId, event?.id]);

  if (!event) return null;

  const join = async () => {
    if (!trackId || joining) return;
    setJoining(true);
    try {
      const response = await fetch(`/api/city/events/${encodeURIComponent(event.id)}/participate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: `ai-${trackId.replace(/^ai-/, '')}` }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Participation impossible.');
      setJoined(true);
      notify.success('Event rejoint', `Ta piste participe maintenant a ${event.title}.`);
    } catch (error) {
      notify.error('Participation impossible', error instanceof Error ? error.message : 'Reessaie dans un instant.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <section className="flex shrink-0 flex-col gap-2 rounded-[1rem] border border-black/[0.08] bg-[linear-gradient(115deg,rgba(124,92,255,.16),rgba(255,111,97,.13),rgba(255,250,242,.86))] px-3 py-2 shadow-[0_10px_30px_rgba(30,25,20,0.07)] sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.7rem] bg-[#171313] text-white"><Trophy className="h-3.5 w-3.5" /></span>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7c5cff]">Challenge actuel</p>
          <p className="truncate text-xs font-black text-[#171313]">{event.title} <span className="font-bold text-black/40">· {event.challengeTag || event.theme}</span></p>
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" onClick={() => onApply(event)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#171313] px-3 text-[10px] font-black text-white transition hover:scale-[1.01]">
          <Sparkles className="h-3.5 w-3.5" /> Creer pour ce brief
        </button>
        {trackId ? (
          <button type="button" disabled={joining || joined} onClick={join} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/80 px-3 text-[10px] font-black text-[#171313] transition hover:bg-white disabled:opacity-60">
            {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : joined ? <Check className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
            {joined ? 'Inscrit' : 'Publier dans l event'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
