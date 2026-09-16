import type { Metadata } from 'next';
import PilotDiscover from '@/components/pilot/PilotDiscover';
import PilotShell from '@/components/pilot/PilotShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Découvrir — Synaura',
  description: 'Choisis une ambiance et entre dans un univers. Ambiances, Radar, collections et artistes réels à explorer.',
  alternates: { canonical: '/discover' },
  openGraph: {
    title: 'Découvrir — Synaura',
    description: 'Choisis une ambiance et entre dans un univers.',
    type: 'website',
    url: '/discover',
  },
};

// Discovery remains public; personalization follows the existing client session.
export default function DiscoverPage() {
  return <PilotShell><PilotDiscover /></PilotShell>;
}
