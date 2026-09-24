import type { Metadata } from 'next';
import PilotDiscover from '@/components/pilot/PilotDiscover';
import PilotShell from '@/components/pilot/PilotShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Découvrir — Synaura',
  description: 'Explorez les sons, artistes, posts, playlists et nouveautés Synaura. Trouvez votre ambiance et poursuivez les découvertes.',
  alternates: { canonical: '/discover' },
  openGraph: {
    title: 'Découvrir — Synaura',
    description: 'Sons, artistes, posts et playlists : votre prochaine découverte vous attend.',
    type: 'website',
    url: '/discover',
  },
};

// Discovery remains public; personalization follows the existing client session.
export default function DiscoverPage() {
  return <PilotShell><PilotDiscover /></PilotShell>;
}
