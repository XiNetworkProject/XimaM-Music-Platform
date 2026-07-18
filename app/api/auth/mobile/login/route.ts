import { NextRequest, NextResponse } from 'next/server';
import { createMobileAuthClient, getMobileAuthUser, mobileSessionPayload } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const authClient = createMobileAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const user = await getMobileAuthUser(data.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Profil utilisateur non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: mobileSessionPayload(data.session, user) }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la connexion' }, { status: 500 });
  }
}
