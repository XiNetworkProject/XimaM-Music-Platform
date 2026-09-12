// Read-only catalog and aggregate audit; never prints credentials or private user rows.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config({ path: '.env.local', quiet: true });
const line = execFileSync('ssh', ['-i', path.join(os.homedir(), '.ssh/id_ed25519_weyra'), '-o', 'BatchMode=yes', 'synaura@192.168.1.43', "sudo -n sed -n '/^DATABASE_URL=/p' /etc/synaura/synaura.env"], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const url = new URL(dotenv.parse(line).DATABASE_URL);
url.hostname = '127.0.0.1'; url.port = '15433';
const client = new pg.Client({ connectionString: url.toString(), application_name: 'community-posts-readonly-audit', statement_timeout: 10000 });
const result = { at: new Date().toISOString(), queries: {} };
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  const queries = {
    identity: `SELECT current_database(), current_user, current_setting('transaction_read_only') AS read_only, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname=current_user`,
    columns: `SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE (table_schema='public' AND table_name IN ('forum_posts','profiles','forum_post_likes')) OR (table_schema='auth' AND table_name='users' AND column_name='id') ORDER BY table_schema, table_name, ordinal_position`,
    constraints: `SELECT conrelid::regclass::text AS table_name, conname, contype, convalidated, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid IN ('public.forum_posts'::regclass,'public.profiles'::regclass,'public.forum_post_likes'::regclass) ORDER BY conrelid::regclass::text, conname`,
    indexes: `SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('forum_posts','profiles','forum_post_likes') ORDER BY tablename,indexname`,
    policies: `SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('forum_posts','profiles','forum_post_likes')`,
    rls: `SELECT oid::regclass::text AS table_name,relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('public.forum_posts'::regclass,'public.profiles'::regclass)`,
    references: `SELECT n.nspname,p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' AND p.prosrc ILIKE '%forum_posts%'`,
    views: `SELECT schemaname,viewname,definition FROM pg_views WHERE schemaname IN ('public','auth') AND definition ILIKE '%forum_posts%'`,
    triggers: `SELECT tgname,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='public.forum_posts'::regclass AND NOT tgisinternal`,
    authors: `SELECT count(*) AS posts,count(DISTINCT f.user_id) AS authors,count(*) FILTER (WHERE f.user_id IS NULL) AS null_author,count(*) FILTER (WHERE f.user_id IS NOT NULL AND p.id IS NULL) AS missing_profile,count(*) FILTER (WHERE f.user_id IS NOT NULL AND u.id IS NULL) AS missing_auth,count(*) FILTER (WHERE p.id IS NOT NULL AND p.avatar IS NULL) AS no_avatar FROM public.forum_posts f LEFT JOIN public.profiles p ON p.id=f.user_id LEFT JOIN auth.users u ON u.id=f.user_id`,
    categories: `SELECT category,count(*) AS posts,count(DISTINCT user_id) AS authors FROM public.forum_posts GROUP BY category ORDER BY category`,
    tied_dates: `SELECT category,created_at,count(*) AS posts FROM public.forum_posts GROUP BY category,created_at HAVING count(*)>1`,
  };
  for (const [name, sql] of Object.entries(queries)) result.queries[name] = (await client.query(sql)).rows;
  await client.query('ROLLBACK');
} finally { await client.end(); }
await fs.mkdir('artifacts/community-posts-fix', { recursive: true });
await fs.writeFile('artifacts/community-posts-fix/schema.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
