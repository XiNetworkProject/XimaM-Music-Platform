#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node database/scripts/canonicalize-schema-dump.mjs <schema-only.sql> <baseline.sql>');
  process.exit(2);
}

const raw = await readFile(inputPath, 'utf8');
const rawHash = createHash('sha256').update(raw).digest('hex');

if (/^COPY\s/mi.test(raw) || /^INSERT\s+INTO\s/mi.test(raw)) {
  throw new Error('Le fichier source contient des instructions de donnees de premier niveau.');
}
if (/^CREATE\s+DATABASE\s/mi.test(raw)) {
  throw new Error('La baseline ne doit pas creer ou cibler une base de production.');
}

const fixedRestriction = 'synaura_phase1a_canonical_baseline';
const normalized = raw
  .replace(/^\\restrict\s+\S+\s*$/m, `\\restrict ${fixedRestriction}`)
  .replace(/^\\unrestrict\s+\S+\s*$/m, `\\unrestrict ${fixedRestriction}`)
  .replace(/\r\n/g, '\n')
  .replace(/[ \t]+$/gm, '');

const header = `-- Synaura canonical PostgreSQL baseline (Phase 1A)\n`
  + `-- Source: production PostgreSQL 17.11, schema-only, captured 2026-09-07.\n`
  + `-- Raw structural snapshot SHA-256: ${rawHash}\n`
  + `-- Contains no table data and no role passwords. Apply only to an empty isolated database.\n\n`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, header + normalized, 'utf8');
console.log(`Baseline ecrite: ${outputPath}`);
console.log(`SHA-256 source: ${rawHash}`);
