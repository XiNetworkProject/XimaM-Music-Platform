import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { authenticateLocalPassword, updateLocalPassword } from '@/lib/localAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  if (!currentPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Mot de passe invalide' }, { status: 400 });
  }
  const current = await authenticateLocalPassword(session.user.email, currentPassword);
  if (!current || current.id !== session.user.id) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 403 });
  }
  if (!await updateLocalPassword(session.user.id, newPassword)) {
    return NextResponse.json({ error: 'Mise a jour impossible' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
