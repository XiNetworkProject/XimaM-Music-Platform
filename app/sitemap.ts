import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.synaura.fr').replace(/\/$/, '');
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/landing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/discover`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/legal`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/legal/mentions-legales`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/legal/confidentialite`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/legal/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/legal/rgpd`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/legal/cgu`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/legal/cgv`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/studio`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  let trackPages: MetadataRoute.Sitemap = [];
  let profilePages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: tracks } = await supabase
      .from('tracks')
      .select('id, updated_at')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (tracks) {
      trackPages = tracks.map((t) => ({
        url: `${baseUrl}/track/${t.id}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .not('username', 'is', null)
      .order('total_plays', { ascending: false })
      .limit(1000);

    if (profiles) {
      profilePages = profiles.map((p) => ({
        url: `${baseUrl}/profile/${p.username}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch (error) {
    console.error('Sitemap: erreur fetch dynamique', error);
  }

  return [...staticPages, ...trackPages, ...profilePages];
}
