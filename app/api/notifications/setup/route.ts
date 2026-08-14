import { NextResponse } from 'next/server';
import { getAdminGuard } from '@/lib/admin';
import { queryDatabase } from '@/lib/postgres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUIRED_TABLES = [
  'notifications',
  'notification_preferences',
  'admin_broadcasts',
  'push_subscriptions',
] as const;

const REQUIRED_NOTIFICATION_COLUMNS = [
  'category',
  'action_url',
  'icon_url',
  'sender_id',
  'related_id',
] as const;

async function auditNotificationSchema() {
  const tableResult = await queryDatabase<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [[...REQUIRED_TABLES]],
  );
  const existingTables = new Set(tableResult.rows.map((row) => row.table_name));

  const columnResult = await queryDatabase<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = ANY($1::text[])`,
    [[...REQUIRED_NOTIFICATION_COLUMNS]],
  );
  const existingColumns = new Set(columnResult.rows.map((row) => row.column_name));

  return {
    tables: Object.fromEntries(
      REQUIRED_TABLES.map((name) => [name, { exists: existingTables.has(name) }]),
    ),
    notificationColumns: Object.fromEntries(
      REQUIRED_NOTIFICATION_COLUMNS.map((name) => [name, { exists: existingColumns.has(name) }]),
    ),
    ready:
      REQUIRED_TABLES.every((name) => existingTables.has(name)) &&
      REQUIRED_NOTIFICATION_COLUMNS.every((name) => existingColumns.has(name)),
  };
}

async function handleAudit() {
  const guard = await getAdminGuard();
  if (!guard.ok) {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 });
  }

  try {
    const audit = await auditNotificationSchema();
    return NextResponse.json({
      ...audit,
      message: audit.ready
        ? 'Le schéma de notifications est prêt.'
        : "Schéma incomplet. Faites valider toute évolution SQL par l'administrateur PostgreSQL ; cette route ne modifie jamais le schéma.",
      vapidConfigured: Boolean(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Audit PostgreSQL impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return handleAudit();
}

export async function POST() {
  return handleAudit();
}
