import type { Metadata } from 'next';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export default async function Head({ params }: { params: { id: string } }) {
  const id = params.id;
  let title = 'Dossier Synaura';
  let description = 'Découvrez ce dossier sur Synaura.';
  let image = '/default-cover.jpg';

  try {
    const { data: playlist } = await supabase
      .from('playlists')
      .select('id, name, description, cover_url, is_public')
      .eq('id', id)
      .maybeSingle();
    if (playlist) {
      title = playlist.name || title;
      description = (playlist.description as string) || description;
      image = playlist.cover_url || image;
    }
  } catch {}

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </>
  );
}


