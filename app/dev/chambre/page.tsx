import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChamberProduct from '@/components/chamber/ChamberProduct';

export const metadata: Metadata = {
  title: 'Synaura — La Chambre Sonore / Écouter',
  robots: { index: false, follow: false },
};

export default function ChamberProductPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ChamberProduct />;
}
