import { queryDatabase, type DatabaseExecutor } from './postgres.ts';

export type AdminEmailRecipient = {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
};

const RESOLVED_EMAIL_SQL = `COALESCE(NULLIF(BTRIM(p.email), ''), NULLIF(BTRIM(u.email), ''))`;

export async function getAdminEmailRecipients(
  userIds?: string[],
  executor?: DatabaseExecutor,
): Promise<AdminEmailRecipient[]> {
  const ids = Array.from(new Set((userIds || []).map(String).filter(Boolean)));
  const restrictToIds = ids.length > 0;
  const result = await queryDatabase<AdminEmailRecipient>(
    `SELECT
       p.id::text AS id,
       ${RESOLVED_EMAIL_SQL} AS email,
       COALESCE(NULLIF(BTRIM(p.name), ''), NULLIF(BTRIM(p.username), ''), 'Utilisateur') AS name
     FROM public.profiles p
     LEFT JOIN auth.users u ON u.id = p.id
     WHERE ${RESOLVED_EMAIL_SQL} IS NOT NULL
       AND ($1::boolean = false OR p.id::text = ANY($2::text[]))
     ORDER BY p.created_at DESC`,
    [restrictToIds, ids],
    executor,
  );
  return result.rows;
}

export async function countAdminEmailRecipients(executor?: DatabaseExecutor) {
  const result = await queryDatabase<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM public.profiles p
     LEFT JOIN auth.users u ON u.id = p.id
     WHERE ${RESOLVED_EMAIL_SQL} IS NOT NULL`,
    [],
    executor,
  );
  return Number(result.rows[0]?.count || 0);
}

export async function searchAdminEmailRecipients(
  search: string,
  executor?: DatabaseExecutor,
): Promise<AdminEmailRecipient[]> {
  const pattern = `%${String(search || '').trim()}%`;
  const result = await queryDatabase<AdminEmailRecipient>(
    `SELECT
       p.id::text AS id,
       ${RESOLVED_EMAIL_SQL} AS email,
       COALESCE(NULLIF(BTRIM(p.name), ''), NULLIF(BTRIM(p.username), ''), 'Utilisateur') AS name,
       p.username,
       p.avatar
     FROM public.profiles p
     LEFT JOIN auth.users u ON u.id = p.id
     WHERE ${RESOLVED_EMAIL_SQL} IS NOT NULL
       AND (
         $1 = '%%'
         OR COALESCE(p.name, '') ILIKE $1
         OR COALESCE(p.username, '') ILIKE $1
         OR ${RESOLVED_EMAIL_SQL} ILIKE $1
       )
     ORDER BY COALESCE(NULLIF(BTRIM(p.name), ''), NULLIF(BTRIM(p.username), ''), ${RESOLVED_EMAIL_SQL}) ASC
     LIMIT 50`,
    [pattern],
    executor,
  );
  return result.rows;
}
