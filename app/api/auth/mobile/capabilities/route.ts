import { NextResponse } from 'next/server';
import { getMobileAuthCapabilities } from '@/lib/mobileAuthSecurity';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getMobileAuthCapabilities();
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error) {
    console.error('[mobile auth capabilities]', error);
    return NextResponse.json({
      success: true,
      data: { email: true, google: false, phone: false, phoneMfa: false, totpMfa: false },
    }, { headers: { 'Cache-Control': 'public, max-age=30' } });
  }
}
