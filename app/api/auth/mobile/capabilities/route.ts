import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 503 });
  }

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      cache: 'no-store',
    });
    const settings = await response.json().catch(() => null);
    if (!response.ok || !settings) throw new Error('Auth settings unavailable');

    return NextResponse.json({
      success: true,
      data: {
        email: settings.external?.email !== false,
        google: Boolean(settings.external?.google),
        phone: Boolean(settings.phone_enabled || settings.external?.phone),
        phoneMfa: Boolean(settings.mfa_enabled || settings.phone_enabled || settings.external?.phone),
      },
    }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return NextResponse.json({
      success: true,
      data: { email: true, google: false, phone: false, phoneMfa: false },
    }, { headers: { 'Cache-Control': 'public, max-age=30' } });
  }
}

