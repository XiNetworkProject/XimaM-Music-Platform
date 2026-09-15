import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authOptions';
import PilotShell from '@/components/pilot/PilotShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Synaura — Pilote', template: '%s · Synaura' },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default async function PilotLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/signin?callbackUrl=%2Fv2%2Flive');
  return <PilotShell>{children}</PilotShell>;
}
