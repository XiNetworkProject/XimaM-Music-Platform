import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [total, solutions, authors, repliers] = await Promise.all([
      db.from('forum_posts').select('id', { count: 'exact', head: true }),
      db.from('forum_replies').select('post_id').eq('is_solution', true),
      db.from('forum_posts').select('user_id').gte('created_at', since),
      db.from('forum_replies').select('user_id').gte('created_at', since),
    ]);
    for (const result of [total, solutions, authors, repliers]) if (result.error) throw result.error;
    const solutionIds = Array.from(new Set((solutions.data || []).map((row: any) => row.post_id)));
    let resolvedQuestions = 0;
    if (solutionIds.length) {
      const questions = await db.from('forum_posts').select('id', { count: 'exact', head: true }).eq('category', 'question').in('id', solutionIds);
      if (questions.error) throw questions.error;
      resolvedQuestions = questions.count || 0;
    }
    return NextResponse.json({
      forumPosts: total.count || 0, resolvedQuestions,
      activeMembers: new Set([...(authors.data || []), ...(repliers.data || [])].map((row: any) => row.user_id).filter(Boolean)).size,
      // No implementation status exists in the schema. Likes are not evidence of delivery.
      implementedSuggestions: null, implementedSuggestionsAvailable: false,
    });
  } catch (error) {
    console.error('[community stats]', error);
    return NextResponse.json({ error: 'Statistiques temporairement indisponibles.' }, { status: 500 });
  }
}
