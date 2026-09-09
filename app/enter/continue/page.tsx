import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { safeEntryTarget } from '@/lib/entryRouting';
import { memberHasCompletedOnboarding } from '@/lib/server/memberEntry';

export const dynamic = 'force-dynamic';

export default async function ContinueIntoSynaura({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const target = safeEntryTarget(searchParams.callbackUrl, '/live');
  const session = await getServerSession(authOptions).catch(() => null);

  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=${encodeURIComponent(target)}`);

  const onboardingCompleted = await memberHasCompletedOnboarding(session.user.id);
  if (onboardingCompleted === false) redirect(`/onboarding?callbackUrl=${encodeURIComponent(target)}`);

  redirect(target);
}
