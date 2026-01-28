'use client';

import Script from 'next/script';
import React from 'react';

export default function AdSenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;

  // Script global AdSense (obligatoire pour <ins class="adsbygoogle" />)
  return (
    <Script
      id="adsense-script"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
      crossOrigin="anonymous"
    />
  );
}

