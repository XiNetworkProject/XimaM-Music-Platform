import type { Metadata } from 'next';
import { Suspense } from 'react';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

export const metadata: Metadata = {
  title: 'Personnalise ton expérience — Synaura',
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#F7F6F3]">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-black/15 border-t-[#7357C6]" />
        </div>
      }
    >
      <OnboardingFlow />
    </Suspense>
  );
}
