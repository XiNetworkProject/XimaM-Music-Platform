import { NextRequest, NextResponse } from 'next/server';
import { diagnosticsEnabled } from '@/lib/diagnostics';
import { getSessionFromToken } from '@/lib/getApiSession';

export async function GET(req: NextRequest) {
  if (!diagnosticsEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const authorization = req.headers.get('authorization');
  const legacyHeader = req.headers.get('x-auth-token');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : legacyHeader?.trim() || '';

  if (!token) {
    return NextResponse.json({
      received: {
        authorization: Boolean(authorization?.startsWith('Bearer ')),
        legacyHeader: Boolean(legacyHeader),
      },
      verify: 'no_token',
    });
  }

  const session = await getSessionFromToken(token);
  if (!session?.user?.id) {
    return NextResponse.json({
      received: {
        authorization: Boolean(authorization?.startsWith('Bearer ')),
        legacyHeader: Boolean(legacyHeader),
      },
      tokenLength: token.length,
      verify: 'invalid',
    });
  }

  return NextResponse.json({
    received: {
      authorization: Boolean(authorization?.startsWith('Bearer ')),
      legacyHeader: Boolean(legacyHeader),
    },
    tokenLength: token.length,
    verify: 'ok',
    userId: session.user.id,
  });
}
