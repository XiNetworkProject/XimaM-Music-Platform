import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { formatMusicClips } from '@/lib/musicClips';

export const getPublicClip = cache(async (id: string) => {
  const { data } = await supabaseAdmin
    .from('music_clips')
    .select('*, creator:profiles!music_clips_creator_id_fkey(id, username, name, avatar)')
    .eq('id', id)
    .eq('visibility', 'published')
    .maybeSingle();
  if (!data) return null;
  const [clip] = await formatMusicClips([data]);
  return clip || null;
});
