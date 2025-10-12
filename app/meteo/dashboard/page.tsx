import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import MeteoDashboardClient from './MeteoDashboardClient';

export default async function MeteoDashboardPage() {
  // Guard server-side
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email || session.user.email !== 'alertempsfrance@gmail.com') {
    redirect('/meteo/login');
  }

  const user = {
    id: session.user.id || '',
    email: session.user.email || '',
    name: session.user.name || undefined,
  };

  return <MeteoDashboardClient user={user} />;
}
