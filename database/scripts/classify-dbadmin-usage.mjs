#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceRoots = ['app', 'components', 'hooks', 'contexts', 'lib'];
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const output = path.join(root, 'database', 'reference', 'dbadmin-usage.csv');
const summaryOutput = path.join(root, 'database', 'reference', 'dbadmin-usage-summary.md');

async function walk(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const relative = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(relative));
    else if (extensions.has(path.extname(entry.name))) files.push(relative.replaceAll('\\', '/'));
  }
  return files;
}

function csv(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function lineAt(content, offset) {
  return content.slice(0, offset).split('\n').length;
}

function statementWindow(content, offset) {
  const end = content.indexOf(';', offset);
  return content.slice(offset, end < 0 ? offset + 3000 : Math.min(end + 1, offset + 3000));
}

const readRpcs = new Set([
  'check_user_quota',
  'get_monthly_generations_count',
  'get_user_ai_stats',
  'get_user_quota_remaining',
]);

function operationFor(kind, objectName, window) {
  if (kind === 'rpc') return readRpcs.has(objectName) ? 'SELECT' : 'MUTATION';
  if (/\.delete\s*\(/.test(window)) return 'DELETE';
  if (/\.upsert\s*\(/.test(window)) return 'UPSERT';
  if (/\.update\s*\(/.test(window)) return 'UPDATE';
  if (/\.insert\s*\(/.test(window)) return 'INSERT';
  if (/\.select\s*\(/.test(window)) return 'SELECT';
  return 'UNKNOWN';
}

function categoryFor(file, operation, content) {
  const normalized = file.toLowerCase();
  if (/(?:^|\/)(?:webhook|callback)(?:\/|\.|$)/.test(normalized)) {
    return ['D', 'webhook/callback externe'];
  }
  if (/(?:^|\/)(?:cron|jobs?|scheduler|scheduled)(?:\/|\.|$)/.test(normalized)) {
    return ['G', 'systeme ou traitement planifie'];
  }
  if (/(?:^|\/)(?:debug|test-auth|setup|migrate|migration|repair|reconcile|backfill|fix-[^/]*)(?:\/|\.|$)/.test(normalized)) {
    return ['E', 'diagnostic ou maintenance'];
  }
  if (normalized.startsWith('app/api/auth/') || /(?:^|\/)(?:authoptions|localauth|mobileauthsecurity)\./.test(normalized)) {
    return ['F', 'authentification ou identite'];
  }
  if (normalized.startsWith('app/api/admin/') || normalized.startsWith('app/admin/') || /(?:^|\/)admin[^/]*\.(?:ts|tsx|js)$/.test(normalized)) {
    return ['C', 'operation administrative protegee'];
  }
  if (/^\s*['"]use client['"];?/m.test(content)) {
    return ['I', 'acces DB direct dans un module client a supprimer'];
  }
  if (operation === 'SELECT') return ['A', 'lecture applicative normale'];
  if (operation !== 'UNKNOWN') return ['B', 'mutation applicative normale'];
  return ['I', 'contrat statique indetermine'];
}

const files = (await Promise.all(sourceRoots.map(walk))).flat().sort();
const rows = [];
const directCall = /\bdbAdmin\s*\.\s*(from|rpc)\s*\(/g;
const literalObject = /^\s*(['"`])([^'"`]+)\1/;

for (const file of files) {
  const content = await readFile(path.join(root, file), 'utf8');
  for (const match of content.matchAll(directCall)) {
    const argumentStart = match.index + match[0].length;
    const objectMatch = content.slice(argumentStart, argumentStart + 300).match(literalObject);
    const objectName = objectMatch?.[2] || '(dynamic)';
    const window = statementWindow(content, match.index);
    let operation = operationFor(match[1], objectName, window);
    if (operation === 'UNKNOWN') {
      operation = operationFor(match[1], objectName, content.slice(match.index, match.index + 1000));
    }
    const [category, rationale] = categoryFor(file, operation, content);
    rows.push({
      category,
      file,
      line: lineAt(content, match.index),
      call_kind: match[1],
      object: objectName,
      operation,
      rationale,
    });
  }
}

const headers = ['category', 'file', 'line', 'call_kind', 'object', 'operation', 'rationale'];
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${headers.join(',')}\n${rows.map((row) => headers.map((header) => csv(row[header])).join(',')).join('\n')}\n`);

const labels = {
  A: 'lecture normale',
  B: 'mutation utilisateur normale',
  C: 'operation administrative',
  D: 'webhook/callback',
  E: 'maintenance/diagnostic',
  F: 'auth',
  G: 'systeme/cron',
  H: 'besoin demontre de privileges eleves',
  I: 'usage injustifie ou indetermine',
};
const counts = Object.fromEntries(Object.keys(labels).map((category) => [
  category,
  rows.filter((row) => row.category === category).length,
]));
const markdown = `# Classification des usages dbAdmin — Phase 1B\n\n`
  + `Classification statique reproductible des appels directs runtime \`dbAdmin.from/rpc\`. `
  + `Les groupes sont exclusifs et leur somme doit rester egale au total Phase 1A.\n\n`
  + Object.entries(labels).map(([category, label]) => `- ${category} — ${label} : ${counts[category]}`).join('\n')
  + `\n\nTotal : ${rows.length} appels dans ${new Set(rows.map((row) => row.file)).size} fichiers.\n\n`
  + `H reste reserve aux operations exigeant un pouvoir PostgreSQL superieur aux grants applicatifs cibles. `
  + `Aucun appel \`from/rpc\` n'a demontre ce besoin : les operations transverses sont couvertes par C, D, E, F ou G, `
  + `et les RPC atomiques peuvent etre accordees explicitement au role applicatif.\n`;
await writeFile(summaryOutput, markdown);

console.log(JSON.stringify({ total: rows.length, files: new Set(rows.map((row) => row.file)).size, counts }, null, 2));
