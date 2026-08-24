const path = require('path');
const { Client } = require('pg');

if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
}

const MARKER = /^<!--SYNAURA_COLLECTION:([\s\S]*?)-->\s*/;

function unpackLegacyCollection(description) {
  const value = String(description || '');
  const match = value.match(MARKER);
  if (!match) return null;
  try {
    const metadata = JSON.parse(match[1]);
    if (!metadata || typeof metadata !== 'object') return null;
    return { metadata, description: value.slice(match[0].length).trim() };
  } catch {
    return null;
  }
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'collection';
}

function uniqueSlug(base, usedSlugs) {
  const root = slugify(base);
  let candidate = root;
  let suffix = 2;
  while (usedSlugs.has(candidate)) candidate = `${root}-${suffix++}`;
  usedSlugs.add(candidate);
  return candidate;
}

function themeColors(value) {
  const colors = (Array.isArray(value) ? value : [])
    .map((entry) => String(entry || '').trim())
    .filter((entry) => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(entry))
    .slice(0, 4);
  return colors.length ? colors : ['#7357C6', '#4A9EAA', '#D96D63'];
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est requise');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');

    const emailBackfill = await client.query(`
      UPDATE public.profiles p
      SET email = BTRIM(u.email)
      FROM auth.users u
      WHERE u.id = p.id
        AND NULLIF(BTRIM(p.email), '') IS NULL
        AND NULLIF(BTRIM(u.email), '') IS NOT NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.admin_email_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        template TEXT NOT NULL,
        subject TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        cta_label TEXT,
        cta_url TEXT,
        target TEXT NOT NULL,
        recipient_count INTEGER NOT NULL DEFAULT 0,
        sent_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS admin_email_campaigns_created_at_idx
      ON public.admin_email_campaigns (created_at DESC)
    `);
    await client.query('ALTER TABLE public.admin_email_campaigns ENABLE ROW LEVEL SECURITY');

    const existing = await client.query(
      'SELECT playlist_id::text AS playlist_id, slug FROM public.editorial_collections',
    );
    const existingPlaylistIds = new Set(existing.rows.map((row) => row.playlist_id));
    const usedSlugs = new Set(existing.rows.map((row) => row.slug));
    const playlists = await client.query(`
      SELECT id::text, creator_id::text, name, description, cover_url, created_at, updated_at
      FROM public.playlists
      WHERE description LIKE '<!--SYNAURA_COLLECTION:%'
      ORDER BY created_at ASC
    `);

    let importedCollections = 0;
    for (const playlist of playlists.rows) {
      if (existingPlaylistIds.has(playlist.id)) continue;
      const unpacked = unpackLegacyCollection(playlist.description);
      if (!unpacked) continue;
      const meta = unpacked.metadata;
      const slug = uniqueSlug(meta.slug || meta.title || playlist.name || playlist.id, usedSlugs);
      await client.query(
        `INSERT INTO public.editorial_collections (
           playlist_id, slug, title, subtitle, description, kind, banner_url, cover_url,
           theme_colors, badge, is_featured, is_published, download_enabled,
           comments_enabled, position, created_by, created_at, updated_at
         ) VALUES (
           $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12,
           $13, $14, $15, $16::uuid, $17::timestamptz, $18::timestamptz
         )
         ON CONFLICT (playlist_id) DO NOTHING`,
        [
          playlist.id,
          slug,
          String(meta.title || playlist.name || 'Collection Synaura'),
          String(meta.subtitle || ''),
          String(meta.description || unpacked.description || ''),
          String(meta.kind || 'collection'),
          typeof meta.bannerUrl === 'string' ? meta.bannerUrl : playlist.cover_url,
          typeof meta.coverUrl === 'string' ? meta.coverUrl : playlist.cover_url,
          JSON.stringify(themeColors(meta.themeColors)),
          String(meta.badge || 'Synaura Originals'),
          meta.isFeatured !== false,
          meta.isPublished === true,
          meta.downloadEnabled !== false,
          meta.commentsEnabled !== false,
          Number.isFinite(Number(meta.position)) ? Number(meta.position) : 0,
          playlist.creator_id,
          playlist.created_at,
          playlist.updated_at,
        ],
      );
      existingPlaylistIds.add(playlist.id);
      importedCollections += 1;
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({
      profileEmailsBackfilled: emailBackfill.rowCount || 0,
      legacyCollectionsFound: playlists.rowCount || 0,
      editorialCollectionsImported: importedCollections,
      campaignHistoryReady: true,
    }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[repair-admin-migration-gaps] ${error.message}`);
  process.exitCode = 1;
});
