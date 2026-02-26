import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getRemainingCredits } from '@/lib/suno';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const json = await getRemainingCredits();
    return NextResponse.json({
      provider: 'sunoapi',
      credits: typeof json?.data === 'number' ? json.data : null,
      code: json?.code,
      msg: json?.msg,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
