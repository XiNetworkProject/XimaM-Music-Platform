import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import PilotLive from '@/components/pilot/PilotLive';
import PilotShell from '@/components/pilot/PilotShell';
import LiveHandoffEntry from '@/components/navigation/LiveHandoffEntry';
import { authOptions } from '@/lib/authOptions';
import { memberHasCompletedOnboarding } from '@/lib/server/memberEntry';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Live Synaura',
  robots: { index: false, follow: false },
};

export default async function LiveSynauraPage() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.id) redirect('/');

  const onboardingCompleted = await memberHasCompletedOnboarding(session.user.id);
  if (onboardingCompleted === false) redirect('/onboarding?callbackUrl=%2Flive');

  return <PilotShell><LiveHandoffEntry><PilotLive /></LiveHandoffEntry></PilotShell>;
}
