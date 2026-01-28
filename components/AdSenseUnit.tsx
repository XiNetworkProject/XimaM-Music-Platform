'use client';

import React, { useEffect, useMemo } from 'react';
import { useEntitlementsClient } from '@/hooks/useEntitlementsClient';

type Props = {
  adSlot: string;
  className?: string;
  style?: React.CSSProperties;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
};

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export default function AdSenseUnit({ adSlot, className, style, format = 'auto', responsive = true }: Props) {
  const { adFree, loading } = useEntitlementsClient();
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  const canRender = useMemo(() => {
    if (!client || !adSlot) return false;
    if (!loading && adFree) return false;
    return true;
  }, [adFree, adSlot, client, loading]);

  useEffect(() => {
    if (!canRender) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // ignore
    }
  }, [adSlot, canRender]);

  if (!canRender) return null;

  return (
    <ins
      className={['adsbygoogle', className || ''].join(' ')}
      style={style || { display: 'block' }}
      data-ad-client={client}
      data-ad-slot={adSlot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}

