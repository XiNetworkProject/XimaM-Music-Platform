import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';
import { unstable_noStore as noStore } from 'next/cache.js';

export type DatabaseExecutor = {
  query<Row extends QueryResultRow = any>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount: number | null }>;
};

const DEFAULT_POOL_SIZE = 10;
const MAX_POOL_SIZE = 50;

function integerEnv(name: string, fallback: number, minimum: number, maximum: number) {
  const parsed = Number.parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function configuredDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error('DATABASE_URL est requise pour acceder a PostgreSQL');
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('DATABASE_URL est invalide');
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL doit utiliser le protocole postgres:// ou postgresql://');
  }
  return value;
}

function configureTypeParsers() {
  // PostgREST renvoyait ces types sous forme JSON. Garder des nombres et des dates
  // serialisables evite de modifier le contrat des API pendant la migration.
  types.setTypeParser(20, (value) => Number(value)); // int8
  types.setTypeParser(1700, (value) => Number(value)); // numeric
  types.setTypeParser(1082, (value) => value); // date
  types.setTypeParser(1114, (value) => value); // timestamp
  types.setTypeParser(1184, (value) => value); // timestamptz
}

configureTypeParsers();

declare global {
  // eslint-disable-next-line no-var
  var __synauraPostgresPool: Pool | undefined;
}

export function getPostgresPool() {
  if (globalThis.__synauraPostgresPool) return globalThis.__synauraPostgresPool;

  const sslMode = (process.env.DATABASE_SSL || '').trim().toLowerCase();
  const pool = new Pool({
    connectionString: configuredDatabaseUrl(),
    max: integerEnv('DATABASE_POOL_MAX', DEFAULT_POOL_SIZE, 1, MAX_POOL_SIZE),
    min: 0,
    idleTimeoutMillis: integerEnv('DATABASE_IDLE_TIMEOUT_MS', 30_000, 1_000, 600_000),
    connectionTimeoutMillis: integerEnv('DATABASE_CONNECT_TIMEOUT_MS', 10_000, 1_000, 60_000),
    statement_timeout: integerEnv('DATABASE_STATEMENT_TIMEOUT_MS', 30_000, 1_000, 300_000),
    query_timeout: integerEnv('DATABASE_QUERY_TIMEOUT_MS', 35_000, 1_000, 305_000),
    application_name: 'synaura-next',
    ssl: sslMode === 'require' || sslMode === 'true'
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
    allowExitOnIdle: process.env.NODE_ENV === 'test',
  });

  pool.on('error', (error) => {
    console.error('[postgres] connexion inactive interrompue:', error.message);
  });
  globalThis.__synauraPostgresPool = pool;
  return pool;
}

export async function queryDatabase<Row extends QueryResultRow = any>(
  text: string,
  values: readonly unknown[] = [],
  executor?: DatabaseExecutor,
) {
  // Une lecture PostgreSQL depend de l'etat courant du serveur et ne doit jamais
  // etre figee dans une page ou une route statique pendant `next build`.
  noStore();
  const target = executor || getPostgresPool();
  return target.query<Row>(text, values);
}

export async function withDatabaseTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPostgresPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function closePostgresPool() {
  const pool = globalThis.__synauraPostgresPool;
  globalThis.__synauraPostgresPool = undefined;
  if (pool) await pool.end();
}
