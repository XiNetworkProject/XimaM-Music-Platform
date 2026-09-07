#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.resolve(process.argv[2] || '.tmp/phase1a/production-catalog.csv');
const outputRoot = path.resolve(process.argv[3] || 'database/reference');
const sourceRoots = ['app', 'components', 'hooks', 'contexts', 'lib', 'scripts'];
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted && character === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function parseSection(lines) {
  if (!lines?.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

async function walk(directory) {
  const absolute = path.join(root, directory);
  const entries = await readdir(absolute, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(relative));
    else files.push(relative.replaceAll('\\', '/'));
  }
  return files;
}

function domainFor(name, file = '') {
  const value = `${name} ${file}`.toLowerCase();
  if (/auth|account_private|password_reset|identity|mfa|session/.test(value)) return 'auth';
  if (/message|conversation|friendship|user_block/.test(value)) return 'messaging';
  if (/notification|push_subscription|broadcast/.test(value)) return 'notifications';
  if (/ai_|suno|generation|credit_ledger|quota/.test(value)) return 'IA';
  if (/playlist|album/.test(value)) return 'playlists';
  if (/comment|reaction/.test(value)) return 'commentaires/reactions';
  if (/follow/.test(value)) return 'follows';
  if (/post|forum|faq|community/.test(value)) return 'Community/posts';
  if (/clip/.test(value)) return 'clips';
  if (/boost/.test(value)) return 'Boosters';
  if (/meteo/.test(value)) return 'Meteo';
  if (/star_academy|sa_/.test(value)) return 'Star Academy';
  if (/city/.test(value)) return 'City';
  if (/subscription|payment|billing|referral/.test(value)) return 'abonnements';
  if (/track_event|track_view|track_stats|play_stats|stat/.test(value)) return 'statistiques';
  if (/track|waveform|music_challenge/.test(value)) return 'tracks';
  if (/profile|user/.test(value)) return 'profils';
  return 'transverse/infrastructure';
}

function isRuntimeFile(file) {
  return !file.startsWith('scripts/')
    && !/(?:^|\/)(?:test|tests|__tests__)(?:\/|$)/i.test(file)
    && !/\.bak$|\.backup\.|page\.backup| - copie/i.test(file);
}

function operationWindow(content, start) {
  const semicolon = content.indexOf(';', start);
  return content.slice(start, semicolon < 0 ? start + 3000 : Math.min(semicolon + 1, start + 3000));
}

function addUsage(usages, key, file, operation, evidence) {
  if (!usages.has(key)) usages.set(key, []);
  usages.get(key).push({ file, operation, evidence, runtime: isRuntimeFile(file) });
}

const catalogText = await readFile(catalogPath, 'utf8');
const catalogHash = createHash('sha256').update(catalogText).digest('hex');
const sectionLines = new Map();
let section = null;
for (const line of catalogText.replace(/\r\n/g, '\n').split('\n')) {
  if (line.startsWith('__SECTION__')) {
    section = line.slice('__SECTION__'.length);
    sectionLines.set(section, []);
  } else if (section && line.trim()) {
    sectionLines.get(section).push(line);
  }
}

await mkdir(path.join(outputRoot, 'catalog'), { recursive: true });
for (const [name, lines] of sectionLines) {
  await writeFile(path.join(outputRoot, 'catalog', `${name}.csv`), `${lines.join('\n')}\n`, 'utf8');
}

const sections = Object.fromEntries([...sectionLines].map(([name, lines]) => [name, parseSection(lines)]));
const relations = sections.relations || [];
const routines = sections.routines || [];
const stats = new Map((sections.table_stats || []).map((row) => [`${row.schema_name}.${row.table_name}`, row]));
const migrations = new Map((sections.migration_history || []).map((row) => [row.version, row]));
const objects = [
  ...relations.map((row) => ({ schema: row.schema_name, name: row.relation_name, kind: row.relation_kind, row })),
  ...routines.map((row) => ({ schema: row.schema_name, name: row.routine_name, kind: row.routine_kind, row })),
];
const knownNames = new Set(objects.map((object) => object.name));

const codeFiles = (await Promise.all(sourceRoots.map(walk)))
  .flat()
  .filter((file) => codeExtensions.has(path.extname(file).toLowerCase()));
const sourceTexts = new Map();
for (const file of codeFiles) sourceTexts.set(file, await readFile(path.join(root, file), 'utf8'));

const usages = new Map();
const upsertRows = [];
for (const [file, content] of sourceTexts) {
  const fromPattern = /\.from\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\)/g;
  for (const match of content.matchAll(fromPattern)) {
    const table = match[1];
    const window = operationWindow(content, match.index);
    const operations = ['select', 'insert', 'update', 'delete', 'upsert']
      .filter((operation) => new RegExp(`\\.${operation}\\s*\\(`).test(window));
    for (const operation of operations.length ? operations : ['unknown']) {
      addUsage(usages, `public.${table}`, file, operation.toUpperCase(), '.from()');
    }
    if (operations.includes('upsert')) {
      const conflictMatch = window.match(/onConflict\s*:\s*['"]([^'"]+)['"]/);
      const columns = (conflictMatch?.[1] || 'id').split(',').map((value) => value.trim());
      const signature = `(${columns.join(', ')})`;
      const matchingIndexes = (sections.indexes || []).filter((index) => (
        index.schema_name === 'public'
        && index.table_name === table
        && index.is_unique === 't'
        && index.definition.includes(signature)
      ));
      upsertRows.push({
        file,
        table,
        conflict_columns: columns.join(' | '),
        unique_contract: matchingIndexes.length ? 'present' : 'absent/indetermine',
        matching_indexes: matchingIndexes.map((index) => index.index_name).join(' | '),
      });
    }
  }

  const rpcPattern = /\.rpc\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g;
  for (const match of content.matchAll(rpcPattern)) {
    addUsage(usages, `public.${match[1]}`, file, 'RPC', '.rpc()');
  }

  const sqlPattern = /\b(SELECT[\s\S]{0,120}?\bFROM|INSERT\s+INTO|UPDATE|DELETE\s+FROM|JOIN)\s+(?:"?([A-Za-z_][A-Za-z0-9_]*)"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi;
  for (const match of content.matchAll(sqlPattern)) {
    const operation = match[1].toUpperCase().startsWith('SELECT') || match[1].toUpperCase() === 'JOIN'
      ? 'SELECT'
      : match[1].toUpperCase().replace(/\s+.*/, '');
    const schemaName = match[2] || 'public';
    const objectName = match[3];
    if (knownNames.has(objectName)) addUsage(usages, `${schemaName}.${objectName}`, file, operation, 'SQL natif');
  }

  for (const object of objects) {
    const key = `${object.schema}.${object.name}`;
    if (usages.get(key)?.some((usage) => usage.file === file)) continue;
    const qualified = `${object.schema}.${object.name}`;
    const relationLiteral = ['table', 'view', 'materialized_view', 'partitioned_table'].includes(object.kind)
      && new RegExp(`['"\\x60]${object.name}['"\\x60]`).test(content);
    if (content.includes(qualified) || relationLiteral) {
      addUsage(usages, key, file, 'REFERENCE', 'reference textuelle');
    }
  }
}

const mapRows = objects.map((object) => {
  const key = `${object.schema}.${object.name}`;
  const objectUsages = usages.get(key) || [];
  const runtimeUsages = objectUsages.filter((usage) => usage.runtime);
  const supportUsages = objectUsages.filter((usage) => !usage.runtime);
  const objectStats = stats.get(key);
  const activity = Number(objectStats?.seq_scan || 0) + Number(objectStats?.idx_scan || 0)
    + Number(objectStats?.n_tup_ins || 0) + Number(objectStats?.n_tup_upd || 0) + Number(objectStats?.n_tup_del || 0);
  let classification;
  if (object.schema !== 'public') classification = 'infrastructure/auth';
  else if (runtimeUsages.length) classification = 'utilise par le runtime';
  else if (activity > 0) classification = 'probablement utilise';
  else if (supportUsages.length) classification = 'legacy mais encore reference';
  else if (['table', 'view', 'materialized_view'].includes(object.kind)) classification = 'legacy sans reference retrouvee';
  else classification = 'inconnu';
  return {
    schema: object.schema,
    object: object.name,
    kind: object.kind,
    domain: domainFor(object.name, runtimeUsages[0]?.file || ''),
    classification,
    operations: [...new Set(objectUsages.map((usage) => usage.operation))].sort().join(' | '),
    runtime_files: [...new Set(runtimeUsages.map((usage) => usage.file))].sort().join(' | '),
    support_files: [...new Set(supportUsages.map((usage) => usage.file))].sort().join(' | '),
    estimated_rows: object.row.estimated_rows || '',
    seq_scans: objectStats?.seq_scan || '',
    index_scans: objectStats?.idx_scan || '',
  };
});

const mapHeaders = Object.keys(mapRows[0]);
await writeFile(
  path.join(outputRoot, 'code-database-map.csv'),
  `${mapHeaders.join(',')}\n${mapRows.map((row) => mapHeaders.map((header) => csvEscape(row[header])).join(',')).join('\n')}\n`,
  'utf8',
);

const knownKeys = new Set(objects.map((object) => `${object.schema}.${object.name}`));
const absentRows = [...usages.entries()]
  .filter(([key]) => !knownKeys.has(key))
  .map(([key, objectUsages]) => ({
    object: key,
    operations: [...new Set(objectUsages.map((usage) => usage.operation))].sort().join(' | '),
    runtime_files: [...new Set(objectUsages.filter((usage) => usage.runtime).map((usage) => usage.file))].sort().join(' | '),
    support_files: [...new Set(objectUsages.filter((usage) => !usage.runtime).map((usage) => usage.file))].sort().join(' | '),
  }))
  .sort((left, right) => left.object.localeCompare(right.object));
const absentHeaders = ['object', 'operations', 'runtime_files', 'support_files'];
await writeFile(
  path.join(outputRoot, 'referenced-objects-absent.csv'),
  `${absentHeaders.join(',')}\n${absentRows.map((row) => absentHeaders.map((header) => csvEscape(row[header])).join(',')).join('\n')}\n`,
  'utf8',
);

const upsertHeaders = ['file', 'table', 'conflict_columns', 'unique_contract', 'matching_indexes'];
await writeFile(
  path.join(outputRoot, 'upsert-contracts.csv'),
  `${upsertHeaders.join(',')}\n${upsertRows.map((row) => upsertHeaders.map((header) => csvEscape(row[header])).join(',')).join('\n')}\n`,
  'utf8',
);

const aiVariants = new Set([
  'create-ai-generations-table.sql',
  'create_ai_generations_table.sql',
  'create_ai_generations_safe.sql',
  'create_ai_generations_direct.sql',
  'create_ai_generations_complete.sql',
]);
const replacedFixes = new Set([
  'fix_ai_generations_schema.sql',
  'fix_ai_generations_structure.sql',
  'fix_ai_tables.sql',
  'fix-rls-policies.sql',
]);

const sqlFiles = (await Promise.all(['scripts', 'supabase'].map(walk)))
  .flat().filter((file) => file.endsWith('.sql')).sort();
const hashes = new Map();
const sqlRows = [];
for (const file of sqlFiles) {
  const content = await readFile(path.join(root, file), 'utf8');
  const base = path.basename(file).toLowerCase();
  const hash = createHash('sha256').update(content).digest('hex');
  if (!hashes.has(hash)) hashes.set(hash, []);
  hashes.get(hash).push(file);
  const targets = [...content.matchAll(/\b(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE(?:\s+IF\s+EXISTS)?|CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION)\s+(?:"?([A-Za-z_][A-Za-z0-9_]*)"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi)]
    .map((match) => `${match[1] || 'public'}.${match[2]}`);
  const presentTargets = targets.filter((target) => objects.some((object) => `${object.schema}.${object.name}` === target));
  const versionMatch = file.match(/supabase\/migrations\/(\d{14})_/);
  let category = 'H';
  let evidence = 'impossible a determiner automatiquement';
  if (!content.trim()) {
    category = 'G'; evidence = 'fichier vide';
  } else if (versionMatch && migrations.has(versionMatch[1])) {
    category = 'A'; evidence = `version ${versionMatch[1]} presente dans supabase_migrations.schema_migrations`;
  } else if (/^(check|delete_test_user|change_password)/.test(base) || base === 'disable_rls_temporarily.sql') {
    category = 'E'; evidence = 'diagnostic ou operation ponctuelle, non rejouable comme migration';
  } else if (aiVariants.has(base)) {
    category = 'D'; evidence = 'variante concurrente du schema ai_generations';
  } else if (replacedFixes.has(base)) {
    category = 'C'; evidence = 'correctif historique remplace par la baseline courante';
  } else if (file.startsWith('supabase/') || base === 'supabase-schema.sql') {
    category = 'F'; evidence = 'bootstrap ou convention Supabase legacy hors historique canonique';
  } else if (/\bauth\.uid\s*\(|\bTO\s+(?:anon|authenticated|service_role)\b/i.test(content)) {
    category = 'F'; evidence = 'policies/grants Supabase legacy non suivis par une migration canonique';
  } else if (targets.length && presentTargets.length === targets.length) {
    category = 'B'; evidence = 'tous les objets cibles existent en production, execution historique non tracee';
  } else if (targets.length && presentTargets.length) {
    category = 'C'; evidence = 'une partie seulement des objets cibles subsiste dans la production actuelle';
  } else if (/\b(?:INSERT|UPDATE|DELETE)\b/i.test(content)) {
    category = 'E'; evidence = 'script de donnees ponctuel, pas une migration de structure fiable';
  }
  sqlRows.push({
    file,
    category,
    evidence,
    targets: [...new Set(targets)].join(' | '),
    targets_in_production: [...new Set(presentTargets)].join(' | '),
    sha256: hash,
  });
}
for (const row of sqlRows) {
  const duplicates = hashes.get(row.sha256).filter((file) => file !== row.file);
  if (duplicates.length) row.evidence += `; contenu identique a ${duplicates.join(' | ')}`;
}

const sqlHeaders = Object.keys(sqlRows[0]);
await writeFile(
  path.join(outputRoot, 'legacy-sql-classification.csv'),
  `${sqlHeaders.join(',')}\n${sqlRows.map((row) => sqlHeaders.map((header) => csvEscape(row[header])).join(',')).join('\n')}\n`,
  'utf8',
);

const categoryCounts = Object.fromEntries('ABCDEFGH'.split('').map((category) => [category, sqlRows.filter((row) => row.category === category).length]));
const classificationCounts = [...new Set(mapRows.map((row) => row.classification))]
  .sort().map((classification) => [classification, mapRows.filter((row) => row.classification === classification).length]);
const dbAdminOccurrences = [...sourceTexts.values()].reduce((count, content) => count + (content.match(/\bdbAdmin\b/g)?.length || 0), 0);
const dbAdminCalls = [...sourceTexts.values()].reduce((count, content) => count + (content.match(/\bdbAdmin\s*\.\s*(?:from|rpc)\s*\(/g)?.length || 0), 0);
const dbAdminFiles = [...sourceTexts].filter(([, content]) => /\bdbAdmin\b/.test(content)).map(([file]) => file);
const runtimeDbAdminCalls = [...sourceTexts].filter(([file]) => isRuntimeFile(file))
  .reduce((count, [, content]) => count + (content.match(/\bdbAdmin\s*\.\s*(?:from|rpc)\s*\(/g)?.length || 0), 0);
const runtimeDbAdminCallFiles = [...sourceTexts].filter(([file, content]) => (
  isRuntimeFile(file) && /\bdbAdmin\s*\.\s*(?:from|rpc)\s*\(/.test(content)
));
const anyOccurrences = [...sourceTexts.values()].reduce((count, content) => count + (content.match(/\bany\b/g)?.length || 0), 0);

const summary = `# Reference generee Phase 1A\n\n`
  + `Snapshot catalogue read-only SHA-256 : \`${catalogHash}\`.\n\n`
  + `- ${relations.length} relations/sequences/vues inventoriees.\n`
  + `- ${routines.length} fonctions/procedures inventoriees.\n`
  + `- ${sqlRows.length} fichiers SQL historiques classes.\n`
  + `- Categories SQL : ${Object.entries(categoryCounts).map(([key, value]) => `${key}=${value}`).join(', ')}.\n`
  + `- ${runtimeDbAdminCalls} appels directs runtime \`dbAdmin.from/rpc\` dans ${runtimeDbAdminCallFiles.length} fichiers; ${dbAdminCalls} appels en incluant les scripts historiques.\n`
  + `- ${dbAdminOccurrences} occurrences textuelles de \`dbAdmin\` dans ${dbAdminFiles.length} fichiers analyses.\n`
  + `- ${anyOccurrences} occurrences textuelles de \`any\` dans les racines analysees (indicateur large, pas uniquement DB).\n\n`
  + `- ${absentRows.length} objets litteraux references par le code mais absents de la production.\n\n`
  + `## Classification des objets\n\n`
  + classificationCounts.map(([name, count]) => `- ${name}: ${count}`).join('\n') + '\n\n'
  + `Les CSV de \`catalog/\` sont des exports de catalogues PostgreSQL sans donnees utilisateur. `
  + `\`code-database-map.csv\` est une cartographie statique : les references dynamiques restent a verifier manuellement.\n`;
await writeFile(path.join(outputRoot, 'GENERATED.md'), summary, 'utf8');

console.log(`Reference catalogue: ${sectionLines.size} sections`);
console.log(`Cartographie: ${mapRows.length} objets`);
console.log(`SQL historiques: ${sqlRows.length} fichiers`);
