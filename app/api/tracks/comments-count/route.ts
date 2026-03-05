import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const trackIds: string[] = Array.isArray(body?.trackIds) ? body.trackIds : [];

    const validIds = trackIds
      .filter((id) => typeof id === 'string' && id.trim() && !id.startsWith('radio-') && !id.startsWith('ai-'))
      .slice(0, 50);

    if (!validIds.length) {
      return NextResponse.json({ counts: {} });
    }

    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('track_id')
      .in('track_id', validIds)
      .is('parent_id', null);

    if (error) {
      return NextResponse.json({ counts: {} });
    }

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const tid = row.track_id;
      counts[tid] = (counts[tid] || 0) + 1;
    }

    return NextResponse.json({ counts });
  } catch {
    return NextResponse.json({ counts: {} });
  }
}
