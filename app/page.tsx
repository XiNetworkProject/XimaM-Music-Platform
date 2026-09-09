import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import DiscoverSynaura from '@/components/discover/DiscoverSynaura';
import { authOptions } from '@/lib/authOptions';
import { memberHasCompletedOnboarding } from '@/lib/server/memberEntry';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Synaura — La musique devient un monde',
  description: 'Écoute, crée et partage autour de la musique. Découvre l’univers Synaura avant d’y entrer.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Synaura — La musique devient un monde',
    description: 'Écoute, crée et partage autour de la musique.',
    type: 'website',
    url: '/',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Synaura' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Synaura — La musique devient un monde',
    description: 'Écoute, crée et partage autour de la musique.',
    images: ['/opengraph-image'],
  },
};

export default async function HomePage() {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = session?.user?.id;

  if (!userId) return <DiscoverSynaura />;

  const onboardingCompleted = await memberHasCompletedOnboarding(userId);
  if (onboardingCompleted === false) redirect('/onboarding?callbackUrl=%2Flive');

  redirect('/live');
}
