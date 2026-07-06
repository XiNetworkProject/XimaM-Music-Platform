import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { COMMUNITY_CLUBS } from '@/lib/communityClubs';
import { attachAuthors, attachTracks } from '@/lib/communityPosts';

export const dynamic = 'force-dynamic';

// Agrégation légère : un seul aller-retour réseau pour la landing Clubs, au lieu de
// 4 appels (count + dernier post) déclenchés séparément côté client par carte.
export async function GET() {
  try {
    const clubs = await Promise.all(
      COMMUNITY_CLUBS.map(async (club) => {
        const [{ count }, { data: latestRows }] = await Promise.all([
          supabase
            .from('forum_posts')
            .select('id', { count: 'exact', head: true })
            .eq('category', club.category),
          supabase
            .from('forum_posts')
            .select(`
              *,
              profiles:user_id (
                id,
                name,
                username,
                avatar
              )
            `)
            .eq('category', club.category)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        const withAuthors = await attachAuthors(latestRows || []);
        const [latestPost] = await attachTracks(withAuthors);

        return {
          slug: club.slug,
          postsCount: count || 0,
          latestPost: latestPost || null,
        };
      }),
    );

    return NextResponse.json({ clubs });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Impossible de charger les Clubs' }, { status: 500 });
  }
}
