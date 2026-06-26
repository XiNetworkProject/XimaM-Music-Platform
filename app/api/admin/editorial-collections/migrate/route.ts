import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getAdminGuard } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const guard = await getAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: 'Non autorise' }, { status: 403 });

  const sqlPath = path.join(process.cwd(), 'scripts', 'create_editorial_collections_table.sql');
  const sql = await fs.readFile(sqlPath, 'utf8');
  const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

  if (error) {
    return NextResponse.json({
      error: error.message,
      action: 'exec_sql indisponible. Lance npm run migrate:collections ou colle le SQL dans Supabase.',
      sql,
    }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}

