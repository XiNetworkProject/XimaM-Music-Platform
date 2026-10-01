import type { Metadata } from 'next';
import SynauraCityPage from '@/components/city/SynauraCityPage';

export const metadata: Metadata = {
  title: 'City — La scène Synaura',
  description: 'Des sons à défendre, des défis à relever et des artistes à rencontrer. Rejoignez les rendez-vous de Synaura City.',
};

export default function CityPage() {
  return <SynauraCityPage />;
}
