import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import SynauraEntryLoading from '@/components/enter/SynauraEntryLoading';
import { authOptions } from '@/lib/authOptions';
import { safeEntryTarget } from '@/lib/entryRouting';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Façonne ton univers — Synaura',
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({ searchParams }: { searchParams: { callbackUrl?: string; edit?: string } }) {
  const session = await getServerSession(authOptions).catch(() => null);
  const target = safeEntryTarget(searchParams.callbackUrl, '/live');
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=${encodeURIComponent(target)}`);

  return <Suspense fallback={<SynauraEntryLoading label="Préparation de ton univers…" />}><OnboardingFlow /></Suspense>;
}
