import { NextRequest, NextResponse } from 'next/server';
import { revokeMobileSession } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (token) await revokeMobileSession(token).catch(() => false);
  return NextResponse.json({ success: true, data: { message: 'Deconnexion reussie' } }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
