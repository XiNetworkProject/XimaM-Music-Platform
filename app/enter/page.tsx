import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import EnterSynaura from '@/components/enter/EnterSynaura';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Entrer dans Synaura',
  description: 'Connecte-toi ou crée ton compte Synaura.',
  robots: { index: false, follow: false },
};

export default async function EnterPage() {
  const session = await getServerSession(authOptions).catch(() => null);
  if (session?.user?.id) redirect('/enter/continue?callbackUrl=%2Flive');
  return <EnterSynaura />;
}
