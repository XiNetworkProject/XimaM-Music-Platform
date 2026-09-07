#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if (character === '\n' && !quoted) {
      row.push(value.replace(/\r$/, ''));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else value += character;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [headers, ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] || ''])));
}

function identifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`Identifiant SQL invalide: ${value}`);
  return value;
}

const reference = path.join(root, 'database', 'reference');
const mappings = parseCsv(await readFile(path.join(reference, 'code-database-map.csv'), 'utf8'));
const relations = parseCsv(await readFile(path.join(reference, 'catalog', 'relations.csv'), 'utf8'));
const routines = parseCsv(await readFile(path.join(reference, 'catalog', 'routines.csv'), 'utf8'));
const sequences = parseCsv(await readFile(path.join(reference, 'catalog', 'sequences.csv'), 'utf8'));
const presentRelations = new Set(relations.filter((row) => row.schema_name === 'public').map((row) => row.relation_name));
const privileges = new Map();
const operationPrivileges = {
  SELECT: ['SELECT'],
  REFERENCE: ['SELECT'],
  INSERT: ['INSERT'],
  UPDATE: ['UPDATE'],
  DELETE: ['DELETE'],
  UPSERT: ['INSERT', 'UPDATE'],
};

for (const mapping of mappings) {
  if (mapping.schema !== 'public' || !mapping.runtime_files || !presentRelations.has(mapping.object)) continue;
  if (!['table', 'view'].includes(mapping.kind)) continue;
  if (!privileges.has(mapping.object)) privileges.set(mapping.object, new Set());
  for (const operation of mapping.operations.split(' | ').filter(Boolean)) {
    for (const privilege of operationPrivileges[operation] || []) privileges.get(mapping.object).add(privilege);
  }
}
// Phase 1B adds this runtime relation after the Phase 1A catalogue snapshot.
privileges.set('admin_email_campaigns', new Set(['INSERT', 'SELECT']));

const runtimeRoutines = new Set(mappings
  .filter((mapping) => mapping.schema === 'public' && mapping.kind === 'function' && mapping.runtime_files)
  .map((mapping) => mapping.object));

const lines = [
  '-- Genere depuis code-database-map.csv pour le role temporaire Phase 1B.',
  '-- La variable psql phase1b_role doit contenir un identifiant de role existant.',
  'GRANT USAGE ON SCHEMA public TO :"phase1b_role";',
];
for (const [relation, grants] of [...privileges].sort(([left], [right]) => left.localeCompare(right))) {
  if (!grants.size) continue;
  lines.push(`GRANT ${[...grants].sort().join(', ')} ON TABLE public.${identifier(relation)} TO :"phase1b_role";`);
}
for (const sequence of sequences) {
  if (sequence.schema_name !== 'public' || !sequence.sequence_name.endsWith('_id_seq')) continue;
  const relation = sequence.sequence_name.slice(0, -'_id_seq'.length);
  if (!privileges.get(relation)?.has('INSERT')) continue;
  lines.push(`GRANT USAGE, SELECT ON SEQUENCE public.${identifier(sequence.sequence_name)} TO :"phase1b_role";`);
}
for (const routine of routines) {
  if (routine.schema_name !== 'public' || !runtimeRoutines.has(routine.routine_name)) continue;
  lines.push(`GRANT EXECUTE ON FUNCTION public.${identifier(routine.routine_name)}(${routine.identity_arguments.replaceAll(/\b[a-z_][a-z0-9_]*\s+(?=(?:uuid|text|integer|inet|json|jsonb|boolean|timestamp|date|character|numeric))/g, '')}) TO :"phase1b_role";`);
}

const output = path.join(reference, 'restricted-role-grants.sql');
await writeFile(output, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ relations: privileges.size, routines: lines.filter((line) => line.startsWith('GRANT EXECUTE')).length }));
