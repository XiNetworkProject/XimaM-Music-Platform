\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;

SELECT
  version,
  name,
  cardinality(statements) AS statement_count,
  md5(array_to_string(statements, E'\n')) AS statements_md5,
  statement_number,
  statement
FROM supabase_migrations.schema_migrations
CROSS JOIN LATERAL unnest(statements) WITH ORDINALITY AS migration(statement, statement_number)
WHERE version = '20260727143000'
ORDER BY statement_number;

COMMIT;
