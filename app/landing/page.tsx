import type { Metadata } from 'next';
import DiscoverSynaura from '@/components/discover/DiscoverSynaura';

export const metadata: Metadata = {
  title: 'Découvrir Synaura',
  description: 'Entre dans un univers où la musique s’écoute, se crée et se partage.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Synaura — La musique devient un monde',
    description: 'Écoute, crée et partage autour de la musique.',
    type: 'website',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Synaura' }],
  },
};

/** Route historique conservée pour les liens entrants, sans deuxième landing. */
export default function LegacyLandingPage() {
  return <DiscoverSynaura legacy />;
}

