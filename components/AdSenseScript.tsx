import React from 'react';

export default function AdSenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;

  // IMPORTANT: pour la validation AdSense, on préfère un <script> statique dans le HTML,
  // plutôt qu'une injection "afterInteractive" (le crawler peut rater l'injection JS).
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
      crossOrigin="anonymous"
    />
  );
}

