#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const root = process.cwd();
const migrationsDirectory = path.join(root, 'database', 'migrations');
const baselineFiles = [
  path.join(root, 'database', 'baseline', '000_prerequisite_roles.sql'),
  path.join(root, 'database', 'baseline', '010_production_schema.sql'),
];
const baselineVersion = '20260907000000';
const migrationPattern = /^(\d{14})_([a-z0-9_]+)\.sql$/;
const flags = new Set(process.argv.slice(2));
const statusOnly = flags.has('--status');
const registerBaseline = flags.has('--baseline');
const production = flags.has('--production');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est requise.');
if (production && process.env.SYNAURA_MIGRATION_BACKUP_CONFIRMED !== '1') {
  throw new Error('Production refusee: confirmer une sauvegarde valide avec SYNAURA_MIGRATION_BACKUP_CONFIRMED=1.');
}
if (statusOnly && registerBaseline) throw new Error('--status et --baseline sont incompatibles.');

async function sha256(files) {
  const hash = createHash('sha256');
  for (const file of files) hash.update(await readFile(file));
  return hash.digest('hex');
}

const files = (await readdir(migrationsDirectory))
  .filter((file) => migrationPattern.test(file))
  .sort((left, right) => left.localeCompare(right));
for (const [index, file] of files.entries()) {
  const match = file.match(migrationPattern);
  if (!match || match[1] <= baselineVersion) throw new Error(`Migration anterieure/a la baseline interdite: ${file}`);
  if (index && files[index - 1].slice(0, 14) === file.slice(0, 14)) throw new Error(`Version dupliquee: ${file}`);
}

const client = new Client({ connectionString: process.env.DATABASE_URL, application_name: 'synaura-migrations' });
await client.connect();
try {
  const database = await client.query('SELECT current_database() AS name, current_user AS role');
  console.log(`Database: ${database.rows[0].name}; role: ${database.rows[0].role}`);

  const trackingExists = await client.query(`
    SELECT to_regclass('synaura_private.schema_migrations')::text AS relation
  `);

  if (statusOnly) {
    if (!trackingExists.rows[0].relation) {
      console.log('Suivi absent; aucune ecriture effectuee.');
      process.exitCode = 1;
    } else {
      const applied = await client.query(`
        SELECT version, name, checksum, applied_at, applied_by
        FROM synaura_private.schema_migrations
        ORDER BY version
      `);
      console.table(applied.rows);
    }
  } else if (registerBaseline) {
    const baselineChecksum = await sha256(baselineFiles);
    await client.query('BEGIN');
    try {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['synaura-schema-migrations']);
      await client.query('CREATE SCHEMA IF NOT EXISTS synaura_private');
      await client.query(`
        CREATE TABLE IF NOT EXISTS synaura_private.schema_migrations (
          version text PRIMARY KEY CHECK (version ~ '^[0-9]{14}$'),
          name text NOT NULL,
          checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
          applied_at timestamptz NOT NULL DEFAULT now(),
          applied_by text NOT NULL DEFAULT current_user
        )
      `);
      const existing = await client.query(
        'SELECT checksum FROM synaura_private.schema_migrations WHERE version = $1',
        [baselineVersion],
      );
      if (existing.rows[0] && existing.rows[0].checksum !== baselineChecksum) {
        throw new Error('La baseline enregistree a un checksum different.');
      }
      if (!existing.rows[0]) {
        await client.query(`
          INSERT INTO synaura_private.schema_migrations(version, name, checksum)
          VALUES ($1, 'production_baseline', $2)
        `, [baselineVersion, baselineChecksum]);
      }
      await client.query('COMMIT');
      console.log(`Baseline enregistree: ${baselineVersion}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } else {
    if (!trackingExists.rows[0].relation) {
      throw new Error('Suivi absent. Valider la baseline, puis executer explicitement --baseline.');
    }
    const appliedResult = await client.query('SELECT version, checksum FROM synaura_private.schema_migrations');
    const applied = new Map(appliedResult.rows.map((row) => [row.version, row.checksum]));
    for (const file of files) {
      const [version, name] = file.match(migrationPattern).slice(1);
      const sql = await readFile(path.join(migrationsDirectory, file), 'utf8');
      if (/^\s*(?:BEGIN|COMMIT|ROLLBACK)\b/im.test(sql)) {
        throw new Error(`${file}: les transactions sont gerees par le runner.`);
      }
      const checksum = createHash('sha256').update(sql).digest('hex');
      if (applied.has(version)) {
        if (applied.get(version) !== checksum) throw new Error(`${file}: checksum modifie apres application.`);
        console.log(`deja appliquee ${file}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['synaura-schema-migrations']);
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query(sql);
        await client.query(`
          INSERT INTO synaura_private.schema_migrations(version, name, checksum)
          VALUES ($1, $2, $3)
        `, [version, name, checksum]);
        await client.query('COMMIT');
        console.log(`appliquee ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  }
} finally {
  await client.end();
}
