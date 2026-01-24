import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export type AdminGuardResult = {
  ok: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  isOwner: boolean;
};

export async function getAdminGuard(): Promise<AdminGuardResult> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const email = (session?.user as any)?.email as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;

  const owners = String(process.env.ADMIN_OWNER_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isOwner = email ? owners.includes(String(email).toLowerCase()) : false;
  const isAdmin = role === 'admin';
  const ok = Boolean(userId) && (isAdmin || isOwner);

  return {
    ok,
    userId: userId || null,
    email: email || null,
    isAdmin,
    isOwner,
  };
}

