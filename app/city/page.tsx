import type { Metadata } from 'next';
import SynauraCityPage from '@/components/city/SynauraCityPage';

export const metadata: Metadata = {
  title: 'Synaura City - La ville musicale vivante',
  description: 'Spotlights, Pulse, Radar, battles, challenges et awards de la communaute Synaura.',
};

export default function CityPage() {
  return <SynauraCityPage />;
}
