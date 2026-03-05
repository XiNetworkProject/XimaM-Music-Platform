import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Code requis' }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, name, username, avatar')
    .eq('referral_code', code)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Code invalide' }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    referrerName: profile.name || profile.username,
    referrerAvatar: profile.avatar,
  });
}
