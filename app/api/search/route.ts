import { NextRequest, NextResponse } from 'next/server';
import { queryDatabase } from '@/lib/postgres';
import { consumeRequestRateLimit, rateLimitResponse } from '@/lib/security/requestSecurity';
import { emptySearch, normalizeSearch, SEARCH_KINDS, type SearchKind } from '@/lib/search/model';
import { readSearchCursor, searchCursor, searchStatement } from '@/lib/search/catalogue';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get('query') || params.get('q') || '').replace(/\s+/g, ' ').trim();
  const filter = params.get('filter') || 'all';
  if (query.length > 120 || (filter !== 'all' && !SEARCH_KINDS.includes(filter as SearchKind)))
    return NextResponse.json({ error: 'Recherche invalide.' }, { status: 400, headers });
  const parsed = Number(params.get('limit') || 12);
  if (!Number.isFinite(parsed) || parsed < 1)
    return NextResponse.json({ error: 'Limite invalide.' }, { status: 400, headers });
  const limit = Math.min(60, Math.floor(parsed));
  const results = emptySearch();
  if (normalizeSearch(query).length < 2)
    return NextResponse.json(
      { ...results, query, filter, totalResults: 0, pagination: {} },
      { headers },
    );
  const rate = consumeRequestRateLimit(request, 'catalogue-search', 120, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate, 'Un instant avant de relancer la recherche.');
  const kinds = filter === 'all' ? [...SEARCH_KINDS] : [filter as SearchKind];
  let cursor = null;
  try {
    if (params.has('cursor') && filter === 'all') throw new Error('Choose a category');
    if (filter !== 'all')
      cursor = readSearchCursor(params.get('cursor'), query, filter as SearchKind);
  } catch {
    return NextResponse.json(
      { error: 'Pagination invalide. Relance la recherche.' },
      { status: 400, headers },
    );
  }
  const started = Date.now();
  try {
    const pagination: Partial<Record<SearchKind, { hasMore: boolean; nextCursor: string | null }>> =
      {};
    await Promise.all(
      kinds.map(async (kind) => {
        const statement = searchStatement(query, kind, limit, cursor);
        const { rows } = await queryDatabase<{ id: string; score: number; payload: any }>(
          statement.text,
          statement.values,
        );
        const page = rows.slice(0, limit);
        results[kind] = page.map((row) => ({ ...row.payload, approximateMatch: row.score < 400 }));
        pagination[kind] = {
          hasMore: rows.length > limit,
          nextCursor:
            rows.length > limit && page.length
              ? searchCursor(page[page.length - 1], query, kind)
              : null,
        };
      }),
    );
    return NextResponse.json(
      {
        ...results,
        query,
        filter,
        pagination,
        totalResults: kinds.reduce((n, kind) => n + results[kind].length, 0),
        engineVersion: 'search-v2',
        performance: { totalTime: Date.now() - started, queryCount: kinds.length },
      },
      { headers },
    );
  } catch {
    console.error('[search] catalogue query failed');
    return NextResponse.json(
      { error: 'La recherche est momentanément indisponible.' },
      { status: 503, headers },
    );
  }
}
