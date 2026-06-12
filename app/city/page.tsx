import type { Metadata } from 'next';
import SynauraCityPage from '@/components/city/SynauraCityPage';

export const metadata: Metadata = {
  title: 'Events - Synaura Pulse',
  description: 'Battles, challenges, nouveaux talents, Pulse et temps forts de la communaute Synaura.',
};

export default function CityPage() {
  return <SynauraCityPage />;
}
