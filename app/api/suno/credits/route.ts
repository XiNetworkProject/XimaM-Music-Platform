import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { getRemainingCredits } from '@/lib/suno';
import { enforceRequestRateLimit } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Acces refuse' }, { status: guard.userId ? 403 : 401 });
  const limited = enforceRequestRateLimit(req, 'suno-provider-credits-admin', 5, 60_000, guard.userId);
  if (limited) return limited;

  try {
    const json = await getRemainingCredits();
    return NextResponse.json({
      provider: 'sunoapi',
      credits: typeof json?.data === 'number' ? json.data : null,
      code: json?.code,
      msg: json?.msg,
    });
  } catch {
    return NextResponse.json({ error: 'Service IA indisponible' }, { status: 502 });
  }
}
