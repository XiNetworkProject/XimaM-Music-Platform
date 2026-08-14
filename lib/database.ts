import { queryDatabase, type DatabaseExecutor } from './postgres.ts';

type DatabaseError = {
  message: string;
  details: string | null;
  hint: string | null;
  code: string;
};

type DatabaseResponse<T = any[]> = {
  data: T;
  error: DatabaseError | null;
  count: number | null;
  status: number;
  statusText: string;
};

type QueryOperation = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

type DirectFilter = {
  kind: 'direct';
  column: string;
  operator: string;
  value: unknown;
  negate?: boolean;
};

type GroupFilter = {
  kind: 'group';
  join: 'AND' | 'OR';
  children: FilterNode[];
  negate?: boolean;
};

type FilterNode = DirectFilter | GroupFilter;

type OrderSpec = {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
};

type ColumnSelection = {
  kind: 'column';
  source: string;
  alias: string;
};

type WildcardSelection = { kind: 'wildcard' };

type RelationSelection = {
  kind: 'relation';
  table: string;
  alias: string;
  hint: string | null;
  inner: boolean;
  selections: Selection[];
};

type Selection = ColumnSelection | WildcardSelection | RelationSelection;

type ForeignKey = {
  constraintName: string;
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
};

const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FILTER_OPERATORS = new Set([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
  'cs', 'cd', 'ov', 'contains', 'containedby', 'overlaps',
]);

function assertIdentifier(value: string, label = 'identifiant SQL') {
  if (!SAFE_IDENTIFIER.test(value)) throw new Error(`${label} invalide: ${value}`);
  return value;
}

function quoteIdentifier(value: string) {
  return `"${assertIdentifier(value).replace(/"/g, '""')}"`;
}

function tableSql(table: string, alias?: string) {
  const base = `"public".${quoteIdentifier(table)}`;
  return alias ? `${base} AS ${quoteIdentifier(alias)}` : base;
}

function splitTopLevel(value: string, separator = ',') {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '(') depth += 1;
    else if (character === ')') depth = Math.max(0, depth - 1);
    else if (character === separator && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function relationOpeningParenthesis(value: string) {
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') {
      if (depth === 0) return index;
      depth += 1;
    }
  }
  return -1;
}

function parseSelections(value = '*'): Selection[] {
  return splitTopLevel(value || '*').map((item): Selection => {
    if (item === '*') return { kind: 'wildcard' };
    const opening = relationOpeningParenthesis(item);
    if (opening > 0 && item.endsWith(')')) {
      const prefix = item.slice(0, opening).trim();
      const nested = item.slice(opening + 1, -1);
      const colon = prefix.indexOf(':');
      const alias = colon >= 0 ? prefix.slice(0, colon).trim() : '';
      const relationPart = colon >= 0 ? prefix.slice(colon + 1).trim() : prefix;
      const relationBits = relationPart.split('!').map((part) => part.trim()).filter(Boolean);
      const table = assertIdentifier(relationBits.shift() || '', 'relation');
      const modifiers = relationBits.map((part) => part.toLowerCase());
      const hint = relationBits.find((part) => !['inner', 'left'].includes(part.toLowerCase())) || null;
      return {
        kind: 'relation',
        table,
        alias: assertIdentifier(alias || table, 'alias de relation'),
        hint,
        inner: modifiers.includes('inner'),
        selections: parseSelections(nested || '*'),
      };
    }
    const colon = item.indexOf(':');
    const alias = colon >= 0 ? item.slice(0, colon).trim() : item;
    const source = colon >= 0 ? item.slice(colon + 1).trim() : item;
    return {
      kind: 'column',
      source: assertIdentifier(source, 'colonne'),
      alias: assertIdentifier(alias, 'alias de colonne'),
    };
  });
}

function normalizeError(error: any): DatabaseError {
  return {
    message: String(error?.message || 'Erreur PostgreSQL'),
    details: error?.detail ? String(error.detail) : null,
    hint: error?.hint ? String(error.hint) : null,
    code: String(error?.code || 'PG_ERROR'),
  };
}

function successful<T>(data: T, count: number | null = null, status = 200): DatabaseResponse<T> {
  return { data, error: null, count, status, statusText: status === 201 ? 'Created' : 'OK' };
}

function failed(error: unknown): DatabaseResponse<null> {
  return { data: null, error: normalizeError(error), count: null, status: 500, statusText: 'Database Error' };
}

function parseFilterValue(operator: string, raw: string): unknown {
  const value = raw.trim();
  if (operator === 'in' && value.startsWith('(') && value.endsWith(')')) {
    return splitTopLevel(value.slice(1, -1)).map((entry) => {
      const unquoted = entry.replace(/^"|"$/g, '');
      if (unquoted === 'null') return null;
      if (unquoted === 'true') return true;
      if (unquoted === 'false') return false;
      return unquoted;
    });
  }
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function parseFilterLeaf(value: string): FilterNode {
  const bits = value.split('.');
  let operatorIndex = bits.findIndex((part, index) => index > 0 && FILTER_OPERATORS.has(part.toLowerCase()));
  let negate = false;
  if (operatorIndex > 0 && bits[operatorIndex - 1]?.toLowerCase() === 'not') {
    negate = true;
    operatorIndex -= 1;
  }
  if (operatorIndex < 1) throw new Error(`Filtre PostgreSQL invalide: ${value}`);
  const operator = bits[operatorIndex + (negate ? 1 : 0)]!.toLowerCase();
  const column = bits.slice(0, operatorIndex).join('.');
  const raw = bits.slice(operatorIndex + (negate ? 2 : 1)).join('.');
  return { kind: 'direct', column, operator, value: parseFilterValue(operator, raw), negate };
}

function parseFilterGroup(value: string, join: 'AND' | 'OR'): FilterNode {
  const children = splitTopLevel(value).map((part): FilterNode => {
    const trimmed = part.trim();
    if (/^and\(.+\)$/i.test(trimmed)) return parseFilterGroup(trimmed.slice(4, -1), 'AND');
    if (/^or\(.+\)$/i.test(trimmed)) return parseFilterGroup(trimmed.slice(3, -1), 'OR');
    if (/^not\.and\(.+\)$/i.test(trimmed)) {
      const group = parseFilterGroup(trimmed.slice(8, -1), 'AND') as GroupFilter;
      group.negate = true;
      return group;
    }
    if (/^not\.or\(.+\)$/i.test(trimmed)) {
      const group = parseFilterGroup(trimmed.slice(7, -1), 'OR') as GroupFilter;
      group.negate = true;
      return group;
    }
    return parseFilterLeaf(trimmed);
  });
  return { kind: 'group', join, children };
}

const relationCache = new Map<string, Promise<ForeignKey[]>>();

async function foreignKeysBetween(table: string, relationTable: string, executor?: DatabaseExecutor) {
  const cacheKey = `${table}:${relationTable}`;
  if (!executor && relationCache.has(cacheKey)) return relationCache.get(cacheKey)!;
  const load = queryDatabase<{
    constraint_name: string;
    source_table: string;
    source_columns: string[];
    target_table: string;
    target_columns: string[];
  }>(`
    SELECT
      con.conname AS constraint_name,
      source.relname AS source_table,
      array_agg(source_attribute.attname ORDER BY key_columns.ordinality) AS source_columns,
      target.relname AS target_table,
      array_agg(target_attribute.attname ORDER BY key_columns.ordinality) AS target_columns
    FROM pg_constraint con
    JOIN pg_class source ON source.oid = con.conrelid
    JOIN pg_namespace source_namespace ON source_namespace.oid = source.relnamespace
    JOIN pg_class target ON target.oid = con.confrelid
    JOIN pg_namespace target_namespace ON target_namespace.oid = target.relnamespace
    JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY
      AS key_columns(source_number, target_number, ordinality) ON TRUE
    JOIN pg_attribute source_attribute
      ON source_attribute.attrelid = source.oid AND source_attribute.attnum = key_columns.source_number
    JOIN pg_attribute target_attribute
      ON target_attribute.attrelid = target.oid AND target_attribute.attnum = key_columns.target_number
    WHERE con.contype = 'f'
      AND source_namespace.nspname = 'public'
      AND target_namespace.nspname = 'public'
      AND ((source.relname = $1 AND target.relname = $2)
        OR (source.relname = $2 AND target.relname = $1))
    GROUP BY con.conname, source.relname, target.relname
  `, [table, relationTable], executor).then(({ rows }) => rows.map((row) => ({
    constraintName: row.constraint_name,
    sourceTable: row.source_table,
    sourceColumns: row.source_columns,
    targetTable: row.target_table,
    targetColumns: row.target_columns,
  })));
  if (!executor) relationCache.set(cacheKey, load);
  return load;
}

async function resolveRelation(table: string, selection: RelationSelection, executor?: DatabaseExecutor) {
  const candidates = await foreignKeysBetween(table, selection.table, executor);
  if (!candidates.length) {
    throw new Error(`Relation PostgreSQL introuvable entre ${table} et ${selection.table}`);
  }
  if (selection.hint) {
    const hint = selection.hint.toLowerCase();
    const exact = candidates.find((candidate) => (
      candidate.constraintName.toLowerCase() === hint
      || candidate.sourceColumns.some((column) => column.toLowerCase() === hint)
      || candidate.targetColumns.some((column) => column.toLowerCase() === hint)
    ));
    if (exact) return exact;
  }
  if (candidates.length === 1) return candidates[0]!;
  const names = [selection.alias, selection.table]
    .map((name) => name.replace(/s$/, '').toLowerCase());
  return candidates.find((candidate) => candidate.sourceColumns.some((column) => (
    names.some((name) => column.toLowerCase() === `${name}_id`)
  ))) || candidates[0]!;
}

function findRelationSelection(selections: Selection[], name: string): RelationSelection {
  const existing = selections.find((selection): selection is RelationSelection => (
    selection.kind === 'relation' && (selection.alias === name || selection.table === name)
  ));
  if (existing) return existing;
  return {
    kind: 'relation',
    table: assertIdentifier(name, 'relation de filtre'),
    alias: assertIdentifier(name, 'relation de filtre'),
    hint: null,
    inner: false,
    selections: [{ kind: 'wildcard' }],
  };
}

function pushParameter(parameters: unknown[], value: unknown) {
  parameters.push(value);
  return `$${parameters.length}`;
}

function directConditionSql(
  expression: string,
  operator: string,
  value: unknown,
  parameters: unknown[],
) {
  const normalized = operator.toLowerCase();
  let sql: string;
  if (normalized === 'is') {
    if (value === null) sql = `${expression} IS NULL`;
    else if (value === true) sql = `${expression} IS TRUE`;
    else if (value === false) sql = `${expression} IS FALSE`;
    else sql = `${expression} IS ${String(value).toUpperCase()}`;
  } else if (normalized === 'in') {
    const values = Array.isArray(value) ? value : [value];
    sql = values.length ? `${expression} = ANY(${pushParameter(parameters, values)})` : 'FALSE';
  } else {
    const operators: Record<string, string> = {
      eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=',
      like: 'LIKE', ilike: 'ILIKE', cs: '@>', contains: '@>', cd: '<@',
      containedby: '<@', ov: '&&', overlaps: '&&',
    };
    const sqlOperator = operators[normalized];
    if (!sqlOperator) throw new Error(`Operateur de filtre non supporte: ${operator}`);
    if (value === null && normalized === 'eq') sql = `${expression} IS NULL`;
    else if (value === null && normalized === 'neq') sql = `${expression} IS NOT NULL`;
    else sql = `${expression} ${sqlOperator} ${pushParameter(parameters, value)}`;
  }
  return sql;
}

async function compileFilterNode(
  node: FilterNode,
  table: string,
  selections: Selection[],
  parameters: unknown[],
  executor?: DatabaseExecutor,
  baseAlias = 'base',
): Promise<string> {
  if (node.kind === 'group') {
    const parts = await Promise.all(node.children.map((child) => (
      compileFilterNode(child, table, selections, parameters, executor, baseAlias)
    )));
    const combined = parts.length ? `(${parts.join(` ${node.join} `)})` : (node.join === 'AND' ? 'TRUE' : 'FALSE');
    return node.negate ? `NOT ${combined}` : combined;
  }

  const path = node.column.split('.').filter(Boolean);
  let condition: string;
  if (path.length === 1) {
    condition = directConditionSql(
      `${quoteIdentifier(baseAlias)}.${quoteIdentifier(path[0]!)}`,
      node.operator,
      node.value,
      parameters,
    );
  } else if (path.length === 2) {
    const relationSelection = findRelationSelection(selections, path[0]!);
    const relation = await resolveRelation(table, relationSelection, executor);
    const relationAlias = `rel_${parameters.length}_${path[0]}`.replace(/[^A-Za-z0-9_]/g, '_');
    const joins: string[] = [];
    if (relation.sourceTable === table) {
      relation.sourceColumns.forEach((column, index) => {
        joins.push(
          `${quoteIdentifier(relationAlias)}.${quoteIdentifier(relation.targetColumns[index]!)} = `
          + `${quoteIdentifier(baseAlias)}.${quoteIdentifier(column)}`,
        );
      });
    } else {
      relation.sourceColumns.forEach((column, index) => {
        joins.push(
          `${quoteIdentifier(relationAlias)}.${quoteIdentifier(column)} = `
          + `${quoteIdentifier(baseAlias)}.${quoteIdentifier(relation.targetColumns[index]!)}`,
        );
      });
    }
    const relatedCondition = directConditionSql(
      `${quoteIdentifier(relationAlias)}.${quoteIdentifier(path[1]!)}`,
      node.operator,
      node.value,
      parameters,
    );
    condition = `EXISTS (SELECT 1 FROM ${tableSql(relationSelection.table, relationAlias)} WHERE ${[
      ...joins,
      relatedCondition,
    ].join(' AND ')})`;
  } else {
    throw new Error(`Filtre de relation trop profond non supporte: ${node.column}`);
  }
  return node.negate ? `NOT (${condition})` : condition;
}

async function compileWhere(
  table: string,
  selections: Selection[],
  filters: FilterNode[],
  parameters: unknown[],
  executor?: DatabaseExecutor,
  includeInnerRelations = true,
) {
  const conditions = await Promise.all(filters.map((filter) => (
    compileFilterNode(filter, table, selections, parameters, executor)
  )));
  if (includeInnerRelations) {
    const innerRelations = selections.filter((selection): selection is RelationSelection => (
      selection.kind === 'relation' && selection.inner
    ));
    for (const selection of innerRelations) {
      const relation = await resolveRelation(table, selection, executor);
      const alias = `inner_${conditions.length}`;
      const joins: string[] = [];
      if (relation.sourceTable === table) {
        relation.sourceColumns.forEach((column, index) => joins.push(
          `${quoteIdentifier(alias)}.${quoteIdentifier(relation.targetColumns[index]!)} = "base".${quoteIdentifier(column)}`,
        ));
      } else {
        relation.sourceColumns.forEach((column, index) => joins.push(
          `${quoteIdentifier(alias)}.${quoteIdentifier(column)} = "base".${quoteIdentifier(relation.targetColumns[index]!)}`,
        ));
      }
      conditions.push(`EXISTS (SELECT 1 FROM ${tableSql(selection.table, alias)} WHERE ${joins.join(' AND ')})`);
    }
  }
  return conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
}

function projectBaseRow(row: Record<string, any>, selections: Selection[]) {
  const projected: Record<string, any> = {};
  if (selections.some((selection) => selection.kind === 'wildcard')) Object.assign(projected, row);
  for (const selection of selections) {
    if (selection.kind === 'column') projected[selection.alias] = row[selection.source];
  }
  return projected;
}

function compositeKey(row: Record<string, any>, columns: string[]) {
  return JSON.stringify(columns.map((column) => row[column] ?? null));
}

async function hydrateRows(
  table: string,
  rawRows: Record<string, any>[],
  selections: Selection[],
  executor?: DatabaseExecutor,
) {
  const projectedRows = rawRows.map((row) => projectBaseRow(row, selections));
  const relationSelections = selections.filter((selection): selection is RelationSelection => selection.kind === 'relation');

  for (const selection of relationSelections) {
    const relation = await resolveRelation(table, selection, executor);
    const baseColumns = relation.sourceTable === table ? relation.sourceColumns : relation.targetColumns;
    const relatedColumns = relation.sourceTable === table ? relation.targetColumns : relation.sourceColumns;
    const parentToOne = relation.sourceTable === table;
    const values = Array.from(new Set(rawRows.map((row) => row[baseColumns[0]!]).filter((value) => value != null)));
    if (!values.length) {
      projectedRows.forEach((row) => { row[selection.alias] = parentToOne ? null : []; });
      continue;
    }

    const childFilters: FilterNode[] = [{
      kind: 'direct',
      column: relatedColumns[0]!,
      operator: 'in',
      value: values,
    }];
    const child = await loadSelectedRows(
      selection.table,
      selection.selections,
      childFilters,
      [],
      null,
      null,
      executor,
    );
    const byKey = new Map<string, any[]>();
    child.rawRows.forEach((rawChild, index) => {
      const key = compositeKey(rawChild, relatedColumns);
      const entries = byKey.get(key) || [];
      entries.push(child.dataRows[index]);
      byKey.set(key, entries);
    });
    rawRows.forEach((rawRow, index) => {
      const matches = byKey.get(compositeKey(rawRow, baseColumns)) || [];
      projectedRows[index]![selection.alias] = parentToOne ? (matches[0] || null) : matches;
    });
  }
  return projectedRows;
}

async function loadSelectedRows(
  table: string,
  selections: Selection[],
  filters: FilterNode[],
  orders: OrderSpec[],
  limit: number | null,
  offset: number | null,
  executor?: DatabaseExecutor,
) {
  const parameters: unknown[] = [];
  const where = await compileWhere(table, selections, filters, parameters, executor);
  const orderSql = orders.length
    ? ` ORDER BY ${orders.map((order) => {
      const path = order.column.split('.');
      if (path.length !== 1) throw new Error(`Tri de relation non supporte: ${order.column}`);
      return `"base".${quoteIdentifier(path[0]!)} ${order.ascending ? 'ASC' : 'DESC'}${
        typeof order.nullsFirst === 'boolean' ? ` NULLS ${order.nullsFirst ? 'FIRST' : 'LAST'}` : ''
      }`;
    }).join(', ')}`
    : '';
  const limitSql = limit == null ? '' : ` LIMIT ${pushParameter(parameters, limit)}`;
  const offsetSql = offset == null || offset <= 0 ? '' : ` OFFSET ${pushParameter(parameters, offset)}`;
  const result = await queryDatabase<Record<string, any>>(
    `SELECT "base".* FROM ${tableSql(table, 'base')}${where}${orderSql}${limitSql}${offsetSql}`,
    parameters,
    executor,
  );
  const rawRows = result.rows;
  const dataRows = await hydrateRows(table, rawRows, selections, executor);
  return { rawRows, dataRows };
}

class LocalTableQuery implements PromiseLike<DatabaseResponse<any[]>> {
  private readonly table: string;
  private readonly executor?: DatabaseExecutor;
  private operation: QueryOperation = 'select';
  private selectionText = '*';
  private selectionOptions: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean } = {};
  private filters: FilterNode[] = [];
  private orders: OrderSpec[] = [];
  private rowLimit: number | null = null;
  private rowOffset: number | null = null;
  private mutationValues: Record<string, any>[] = [];
  private mutationOptions: Record<string, any> = {};
  private returningRequested = false;
  private singular: 'single' | 'maybeSingle' | null = null;

  constructor(table: string, executor?: DatabaseExecutor) {
    this.table = table;
    this.executor = executor;
    assertIdentifier(table, 'table');
  }

  select(columns = '*', options: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean } = {}) {
    this.selectionText = columns || '*';
    this.selectionOptions = { ...this.selectionOptions, ...options };
    if (this.operation !== 'select') this.returningRequested = true;
    return this;
  }

  insert(values: Record<string, any> | Record<string, any>[], options: Record<string, any> = {}) {
    this.operation = 'insert';
    this.mutationValues = Array.isArray(values) ? values : [values];
    this.mutationOptions = options;
    return this;
  }

  update(values: Record<string, any>, options: Record<string, any> = {}) {
    this.operation = 'update';
    this.mutationValues = [values];
    this.mutationOptions = options;
    return this;
  }

  upsert(values: Record<string, any> | Record<string, any>[], options: Record<string, any> = {}) {
    this.operation = 'upsert';
    this.mutationValues = Array.isArray(values) ? values : [values];
    this.mutationOptions = options;
    return this;
  }

  delete(options: Record<string, any> = {}) {
    this.operation = 'delete';
    this.mutationOptions = options;
    return this;
  }

  eq(column: string, value: unknown) { return this.addFilter(column, 'eq', value); }
  neq(column: string, value: unknown) { return this.addFilter(column, 'neq', value); }
  gt(column: string, value: unknown) { return this.addFilter(column, 'gt', value); }
  gte(column: string, value: unknown) { return this.addFilter(column, 'gte', value); }
  lt(column: string, value: unknown) { return this.addFilter(column, 'lt', value); }
  lte(column: string, value: unknown) { return this.addFilter(column, 'lte', value); }
  like(column: string, value: unknown) { return this.addFilter(column, 'like', value); }
  ilike(column: string, value: unknown) { return this.addFilter(column, 'ilike', value); }
  is(column: string, value: unknown) { return this.addFilter(column, 'is', value); }
  in(column: string, values: unknown[]) { return this.addFilter(column, 'in', values); }
  contains(column: string, value: unknown) { return this.addFilter(column, 'contains', value); }
  containedBy(column: string, value: unknown) { return this.addFilter(column, 'containedby', value); }
  overlaps(column: string, value: unknown) { return this.addFilter(column, 'overlaps', value); }

  match(values: Record<string, unknown>) {
    Object.entries(values).forEach(([column, value]) => this.eq(column, value));
    return this;
  }

  filter(column: string, operator: string, value: unknown) {
    return this.addFilter(column, operator, value);
  }

  not(column: string, operator: string, value: unknown) {
    this.filters.push({ kind: 'direct', column, operator, value, negate: true });
    return this;
  }

  or(expression: string, options?: { foreignTable?: string; referencedTable?: string }) {
    const relation = options?.foreignTable || options?.referencedTable;
    const group = parseFilterGroup(expression, 'OR');
    if (relation) {
      const prefix = (node: FilterNode): FilterNode => {
        if (node.kind === 'direct') return { ...node, column: `${relation}.${node.column}` };
        return { ...node, children: node.children.map(prefix) };
      };
      this.filters.push(prefix(group));
    } else {
      this.filters.push(group);
    }
    return this;
  }

  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.orders.push({
      column,
      ascending: options.ascending !== false,
      nullsFirst: options.nullsFirst,
    });
    return this;
  }

  limit(value: number) {
    this.rowLimit = Math.max(0, Math.floor(Number(value) || 0));
    return this;
  }

  range(from: number, to: number) {
    const start = Math.max(0, Math.floor(Number(from) || 0));
    const end = Math.max(start, Math.floor(Number(to) || 0));
    this.rowOffset = start;
    this.rowLimit = end - start + 1;
    return this;
  }

  single(): any {
    this.singular = 'single';
    this.rowLimit = this.rowLimit == null ? 2 : this.rowLimit;
    return this;
  }

  maybeSingle(): any {
    this.singular = 'maybeSingle';
    this.rowLimit = this.rowLimit == null ? 2 : this.rowLimit;
    return this;
  }

  throwOnError() { return this; }
  abortSignal(_signal: AbortSignal) { return this; }
  returns<T>() { return this as unknown as PromiseLike<DatabaseResponse<T>>; }

  then<TResult1 = DatabaseResponse<any[]>, TResult2 = never>(
    onfulfilled?: ((value: DatabaseResponse<any[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private addFilter(column: string, operator: string, value: unknown) {
    const path = column.split('.');
    path.forEach((part) => assertIdentifier(part, 'colonne de filtre'));
    this.filters.push({ kind: 'direct', column, operator, value });
    return this;
  }

  private applySingular(rows: any[]) {
    if (!this.singular) return successful(rows, null);
    if (rows.length === 1) return successful(rows[0], null);
    if (rows.length === 0 && this.singular === 'maybeSingle') return successful(null, null);
    return failed({
      message: this.singular === 'single'
        ? 'La requete devait retourner exactement une ligne'
        : 'La requete a retourne plusieurs lignes',
      code: 'PGRST116',
    });
  }

  private async executeSelect() {
    const selections = parseSelections(this.selectionText);
    let count: number | null = null;
    if (this.selectionOptions.count) {
      const countParameters: unknown[] = [];
      const where = await compileWhere(this.table, selections, this.filters, countParameters, this.executor);
      const countResult = await queryDatabase<{ count: number }>(
        `SELECT count(*)::bigint AS count FROM ${tableSql(this.table, 'base')}${where}`,
        countParameters,
        this.executor,
      );
      count = Number(countResult.rows[0]?.count || 0);
    }
    if (this.selectionOptions.head) return successful(null, count);
    const { dataRows } = await loadSelectedRows(
      this.table,
      selections,
      this.filters,
      this.orders,
      this.rowLimit,
      this.rowOffset,
      this.executor,
    );
    const response = this.applySingular(dataRows);
    response.count = count;
    return response;
  }

  private mutationColumns() {
    return Array.from(new Set(this.mutationValues.flatMap((row) => Object.keys(row).filter((key) => row[key] !== undefined))))
      .map((column) => assertIdentifier(column, 'colonne de mutation'));
  }

  private async executeMutation() {
    const selections = parseSelections(this.selectionText);
    const parameters: unknown[] = [];
    let sql = '';
    if (this.operation === 'insert' || this.operation === 'upsert') {
      if (!this.mutationValues.length) return successful(this.returningRequested ? [] : null, 0, 201);
      const columns = this.mutationColumns();
      if (!columns.length) throw new Error('Insertion PostgreSQL vide non supportee');
      const rowsSql = this.mutationValues.map((row) => `(${columns.map((column) => (
        pushParameter(parameters, row[column] === undefined ? null : row[column])
      )).join(', ')})`).join(', ');
      sql = `INSERT INTO ${tableSql(this.table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES ${rowsSql}`;
      if (this.operation === 'upsert') {
        const conflictColumns = String(this.mutationOptions.onConflict || 'id')
          .split(',').map((column) => assertIdentifier(column.trim(), 'colonne de conflit'));
        if (this.mutationOptions.ignoreDuplicates) {
          sql += ` ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(', ')}) DO NOTHING`;
        } else {
          const updates = columns.filter((column) => !conflictColumns.includes(column));
          sql += ` ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(', ')}) DO ${
            updates.length
              ? `UPDATE SET ${updates.map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`).join(', ')}`
              : 'NOTHING'
          }`;
        }
      }
    } else if (this.operation === 'update') {
      const row = this.mutationValues[0] || {};
      const columns = Object.keys(row).filter((column) => row[column] !== undefined)
        .map((column) => assertIdentifier(column, 'colonne de mise a jour'));
      if (!columns.length) throw new Error('Mise a jour PostgreSQL vide');
      const setSql = columns.map((column) => `${quoteIdentifier(column)} = ${pushParameter(parameters, row[column])}`).join(', ');
      const where = await compileWhere(this.table, selections, this.filters, parameters, this.executor, false);
      sql = `UPDATE ${tableSql(this.table, 'base')} SET ${setSql}${where}`;
    } else if (this.operation === 'delete') {
      const where = await compileWhere(this.table, selections, this.filters, parameters, this.executor, false);
      sql = `DELETE FROM ${tableSql(this.table, 'base')}${where}`;
    }
    sql += ' RETURNING *';
    const result = await queryDatabase<Record<string, any>>(sql, parameters, this.executor);
    const count = this.mutationOptions.count ? Number(result.rowCount || 0) : null;
    if (!this.returningRequested) return successful(null, count, this.operation === 'insert' ? 201 : 200);
    const dataRows = await hydrateRows(this.table, result.rows, selections, this.executor);
    const response = this.applySingular(dataRows);
    response.count = count;
    response.status = this.operation === 'insert' ? 201 : 200;
    return response;
  }

  private async execute(): Promise<DatabaseResponse<any[]>> {
    try {
      return (this.operation === 'select' ? await this.executeSelect() : await this.executeMutation()) as DatabaseResponse<any[]>;
    } catch (error) {
      return failed(error) as unknown as DatabaseResponse<any[]>;
    }
  }
}

class LocalRpcQuery implements PromiseLike<DatabaseResponse<any>> {
  private readonly functionName: string;
  private readonly args: Record<string, unknown>;
  private readonly executor?: DatabaseExecutor;
  private singular: 'single' | 'maybeSingle' | null = null;

  constructor(functionName: string, args: Record<string, unknown>, executor?: DatabaseExecutor) {
    this.functionName = functionName;
    this.args = args;
    this.executor = executor;
    assertIdentifier(functionName, 'fonction PostgreSQL');
    Object.keys(args).forEach((name) => assertIdentifier(name, 'argument RPC'));
  }

  single() { this.singular = 'single'; return this; }
  maybeSingle() { this.singular = 'maybeSingle'; return this; }
  select() { return this; }
  eq() { return this; }
  order() { return this; }
  limit() { return this; }

  then<TResult1 = DatabaseResponse<any>, TResult2 = never>(
    onfulfilled?: ((value: DatabaseResponse<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<DatabaseResponse<any>> {
    try {
      const entries = Object.entries(this.args);
      const metadata = await queryDatabase<{ proretset: boolean; typtype: string }>(`
        SELECT procedure.proretset, return_type.typtype
        FROM pg_proc procedure
        JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
        JOIN pg_type return_type ON return_type.oid = procedure.prorettype
        WHERE namespace.nspname = 'public'
          AND procedure.proname = $1
          AND procedure.pronargs >= $2
          AND procedure.pronargs - procedure.pronargdefaults <= $2
        ORDER BY (procedure.pronargs = $2) DESC
        LIMIT 1
      `, [this.functionName, entries.length], this.executor);
      if (!metadata.rows[0]) throw Object.assign(new Error(`Fonction PostgreSQL absente: ${this.functionName}`), { code: '42883' });
      const parameters = entries.map(([, value]) => value);
      const callArgs = entries.map(([name], index) => `${quoteIdentifier(name)} => $${index + 1}`).join(', ');
      const call = `"public".${quoteIdentifier(this.functionName)}(${callArgs})`;
      if (!metadata.rows[0].proretset && metadata.rows[0].typtype !== 'c') {
        const result = await queryDatabase<{ value: any }>(`SELECT ${call} AS value`, parameters, this.executor);
        return successful(result.rows[0]?.value ?? null, null);
      }
      const result = await queryDatabase<Record<string, any>>(`SELECT * FROM ${call}`, parameters, this.executor);
      if (this.singular) {
        if (result.rows.length === 1) return successful(result.rows[0], null);
        if (!result.rows.length && this.singular === 'maybeSingle') return successful(null, null);
        return failed({ message: 'Cardinalite RPC inattendue', code: 'PGRST116' });
      }
      return successful(result.rows, null);
    } catch (error) {
      return failed(error);
    }
  }
}

export class LocalDatabaseClient {
  private readonly executor?: DatabaseExecutor;

  constructor(executor?: DatabaseExecutor) {
    this.executor = executor;
  }

  from(table: string) {
    return new LocalTableQuery(table, this.executor);
  }

  rpc(functionName: string, args: Record<string, unknown> = {}) {
    return new LocalRpcQuery(functionName, args, this.executor);
  }
}

export function createDatabaseClient(executor?: DatabaseExecutor) {
  return new LocalDatabaseClient(executor);
}

// Les deux noms restent disponibles pendant la conversion mecanique des routes.
// Ils pointent vers le meme pool serveur et ne possedent aucune cle privilegiee.
export const db = createDatabaseClient();
export const dbAdmin = db;
