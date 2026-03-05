import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.synaura.fr').replace(/\/$/, '');

async function getProfile(username: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('profiles')
      .select('username, name, bio, avatar, is_artist, artist_name, genre, total_plays, total_likes, followers_count')
      .eq('username', username.toLowerCase())
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const profile = await getProfile(params.username);
  if (!profile) {
    return { title: 'Profil — Synaura' };
  }

  const displayName = profile.name || profile.artist_name || `@${profile.username}`;
  const title = `${displayName} — Synaura`;
  const description = profile.bio
    ? `${displayName} sur Synaura : ${profile.bio.slice(0, 140)}`
    : `Découvre le profil de ${displayName} sur Synaura — musique, créations IA et plus.`;
  const url = `${BASE_URL}/profile/${profile.username}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Synaura',
      type: 'profile',
      ...(profile.avatar ? { images: [{ url: profile.avatar, width: 200, height: 200, alt: displayName }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(profile.avatar ? { images: [profile.avatar] } : {}),
    },
    alternates: { canonical: url },
  };
}

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { username: string };
}) {
  const profile = await getProfile(params.username);

  const jsonLd = profile ? {
    '@context': 'https://schema.org',
    '@type': profile.is_artist ? 'MusicGroup' : 'Person',
    name: profile.name || profile.artist_name || profile.username,
    url: `${BASE_URL}/profile/${profile.username}`,
    ...(profile.avatar ? { image: profile.avatar } : {}),
    ...(profile.bio ? { description: profile.bio } : {}),
    ...(profile.genre?.length ? { genre: profile.genre.join(', ') } : {}),
    sameAs: `${BASE_URL}/profile/${profile.username}`,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ListenAction',
        userInteractionCount: profile.total_plays || 0,
      },
    ],
  } : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      {children}
    </>
  );
}
