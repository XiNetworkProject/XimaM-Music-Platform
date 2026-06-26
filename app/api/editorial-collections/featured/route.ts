import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isMissingEditorialCollectionsTable, normalizeEditorialCollection } from '@/lib/editorialCollections';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('editorial_collections')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    if (isMissingEditorialCollectionsTable(error)) return NextResponse.json({ collections: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const collections = (data || [])
    .map((row) => normalizeEditorialCollection(row as any))
    .filter(Boolean);

  return NextResponse.json({ collections });
}

