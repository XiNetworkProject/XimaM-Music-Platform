import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import MeteoDashboardClient from './MeteoDashboardClient';

export default async function MeteoDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/meteo/login');
  }

  const { data: teamMember } = await supabaseAdmin
    .from('meteo_team_members')
    .select('role, status')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .single();

  if (!teamMember) {
    redirect('/meteo/login');
  }

  const user = {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name || undefined,
  };

  return <MeteoDashboardClient user={user} role={teamMember.role} />;
}
