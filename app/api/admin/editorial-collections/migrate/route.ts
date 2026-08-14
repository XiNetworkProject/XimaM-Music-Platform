import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAdminGuard } from '@/lib/admin';
import { queryDatabase } from '@/lib/postgres';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
  const existing = await queryDatabase<{ exists: boolean }>(`
    SELECT to_regclass('public.editorial_collections') IS NOT NULL AS exists
  `);
  if (existing.rows[0]?.exists) {
    return NextResponse.json({ success: true, message: 'Schema deja present; aucune migration executee.' });
  }
  const sql = await readFile(path.join(process.cwd(), 'scripts', 'create_editorial_collections_table.sql'), 'utf8');
  return NextResponse.json({
    error: 'La table editorial_collections est absente.',
    action: 'Faites valider puis executer ce SQL separement par administrateur PostgreSQL.',
    sql,
  }, { status: 422 });
}

