import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/announcements (public)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select('*')
    .eq('published', true)
    .or('starts_at.is.null,starts_at.lte.now()')
    .or('ends_at.is.null,ends_at.gte.now()')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

