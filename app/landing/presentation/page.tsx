import type { Metadata } from 'next';
import SynauraPresentation from '@/components/enter/SynauraPresentation';
import { safeEntryTarget } from '@/lib/entryRouting';

export const metadata: Metadata = {
  title: 'Bienvenue dans Synaura — écouter, créer, se rencontrer',
  description: 'Découvrez le Live, les artistes et le Studio Synaura avant de créer votre compte.',
  alternates: { canonical: '/landing/presentation' },
};

export default function PresentationPage({ searchParams }: { searchParams?: { callbackUrl?: string } }) {
  return <SynauraPresentation callbackUrl={safeEntryTarget(searchParams?.callbackUrl, '/live')} />;
}
