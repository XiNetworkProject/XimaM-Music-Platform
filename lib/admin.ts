import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Bootstrap owner (hard-coded, demandé par toi)
const DEFAULT_OWNER_EMAILS = ['vermeulenmaxime59@gmail.com'];
// Le profil fondateur migre vers PostgreSQL n'a pas d'email renseigne. Son UUID
// est stable et ne peut pas etre renomme/reattribue comme un username.
const DEFAULT_OWNER_USER_IDS = ['f64a1b7a-c261-4ad5-955b-c0ad06a1d0bb'];

export type AdminGuardResult = {
  ok: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  isOwner: boolean;
};

export function getOwnerEmails(): string[] {
  const fromEnv = String(process.env.ADMIN_OWNER_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const merged = [...DEFAULT_OWNER_EMAILS.map((e) => e.toLowerCase()), ...fromEnv];
  return Array.from(new Set(merged)).filter(Boolean);
}

export function getOwnerUserIds(): string[] {
  const fromEnv = String(process.env.ADMIN_OWNER_USER_IDS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const merged = [...DEFAULT_OWNER_USER_IDS.map((id) => id.toLowerCase()), ...fromEnv];
  return Array.from(new Set(merged)).filter(Boolean);
}

export async function getAdminGuard(): Promise<AdminGuardResult> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const email = (session?.user as any)?.email as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;

  const owners = getOwnerEmails();
  const ownerUserIds = getOwnerUserIds();
  const isOwnerByEmail = email ? owners.includes(String(email).toLowerCase()) : false;
  const isOwnerByUserId = userId ? ownerUserIds.includes(String(userId).toLowerCase()) : false;
  const isOwner = isOwnerByEmail || isOwnerByUserId;
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

