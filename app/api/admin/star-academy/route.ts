import { NextRequest, NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit  = 30;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('star_academy_applications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,tiktok_handle.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[admin/star-academy]', error);
    return NextResponse.json({ error: 'Erreur base de données.' }, { status: 500 });
  }

  return NextResponse.json({ applications: data, total: count, page, limit });
}
