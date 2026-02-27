import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';

/** GET /api/auth/mobile/me — Vérifie que le token Bearer est valide et retourne le profil (pour debug / sync). */
export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Non authentifié', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  return NextResponse.json({
    success: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      username: session.user.username,
    },
  });
}
