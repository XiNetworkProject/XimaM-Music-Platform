'use client';

import Link from 'next/link';
import React from 'react';
import { Megaphone, Crown } from 'lucide-react';
import { useEntitlementsClient } from '@/hooks/useEntitlementsClient';
import AdSenseUnit from '@/components/AdSenseUnit';

type Props = {
  placement: 'home_card' | 'feed_inline' | 'player_banner';
  className?: string;
};

export default function AdSlot({ placement, className }: Props) {
  const { adFree, loading, plan } = useEntitlementsClient();
  const adSenseSlot =
    placement === 'home_card'
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME || ''
      : placement === 'feed_inline'
        ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED || ''
        : process.env.NEXT_PUBLIC_ADSENSE_SLOT_PLAYER || '';

  const title = placement === 'player_banner' ? 'Sans pub avec Starter+' : 'Sponsorisé';

  // Si l'utilisateur est sans pub, on ne rend rien (zéro layout shift).
  if (!loading && adFree) return null;

  // Si AdSense est configuré, on affiche une vraie pub (sinon fallback house ad)
  if (process.env.NEXT_PUBLIC_ADSENSE_CLIENT && adSenseSlot) {
    return (
      <div className={className} data-placement={placement}>
        <AdSenseUnit adSlot={adSenseSlot} className="w-full" />
      </div>
    );
  }

  // MVP: "house ad" non intrusive (upgrade). On pluggera un vrai provider ensuite.
  return (
    <div
      className={[
        'rounded-2xl border border-border-secondary bg-background-fog-thin overflow-hidden',
        className || '',
      ].join(' ')}
      data-placement={placement}
    >
      <div className="p-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="h-9 w-9 rounded-2xl bg-background-tertiary border border-border-secondary grid place-items-center shrink-0">
            <Megaphone className="h-4 w-4 text-foreground-secondary" />
          </span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.22em] text-foreground-inactive">{title}</div>
            <div className="text-sm font-semibold text-foreground-primary truncate">
              Retire les pubs (visuelles + audio)
            </div>
            <div className="text-xs text-foreground-tertiary">
              Plan actuel: <span className="font-semibold">{plan}</span>
            </div>
          </div>
        </div>

        <Link
          href="/subscriptions"
          className="shrink-0 inline-flex items-center gap-2 h-9 px-3 rounded-full bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition text-xs font-semibold"
        >
          <Crown className="h-4 w-4" />
          Passer Pro
        </Link>
      </div>
    </div>
  );
}

