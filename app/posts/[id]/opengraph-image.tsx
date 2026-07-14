import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeRemixTrackRef } from '@/lib/remixServer';

export const runtime = 'nodejs';
export const alt = 'Publication musicale Synaura';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  let author = 'Communauté Synaura';
  let username = 'synaura';
  let avatar: string | null = null;
  let content = 'Une publication musicale à découvrir sur Synaura.';
  let media: string | null = null;
  let trackTitle = '';
  let trackArtist = '';
  let likes = 0;
  let comments = 0;

  try {
    const { data: post } = await supabaseAdmin
      .from('creator_posts')
      .select('content, image_url, track_id, likes_count, comments_count, is_public, profiles!creator_posts_creator_id_fkey(username, name, avatar)')
      .eq('id', params.id)
      .eq('is_public', true)
      .maybeSingle();
    if (post) {
      const profile: any = (post as any).profiles || {};
      author = profile.name || profile.username || author;
      username = profile.username || username;
      avatar = profile.avatar || null;
      content = String((post as any).content || content).slice(0, 250);
      media = (post as any).image_url || null;
      likes = Number((post as any).likes_count || 0);
      comments = Number((post as any).comments_count || 0);

      if ((post as any).track_id) {
        const ref = normalizeRemixTrackRef(String((post as any).track_id));
        if (ref.type === 'ai_track') {
          const { data: track } = await supabaseAdmin.from('ai_tracks').select('title, image_url, generation:ai_generations!inner(user_id)').eq('id', ref.id).maybeSingle();
          if (track) {
            trackTitle = (track as any).title || 'Création IA';
            media = media || (track as any).image_url || null;
            const ownerId = (track as any).generation?.user_id;
            if (ownerId) {
              const { data: owner } = await supabaseAdmin.from('profiles').select('name, username').eq('id', ownerId).maybeSingle();
              trackArtist = owner?.name || owner?.username || 'Artiste Synaura';
            }
          }
        } else {
          const { data: track } = await supabaseAdmin.from('tracks').select('title, cover_url, creator_id').eq('id', ref.id).eq('is_public', true).maybeSingle();
          if (track) {
            trackTitle = track.title || 'Son Synaura';
            media = media || track.cover_url || null;
            if (track.creator_id) {
              const { data: owner } = await supabaseAdmin.from('profiles').select('name, username, artist_name').eq('id', track.creator_id).maybeSingle();
              trackArtist = owner?.artist_name || owner?.name || owner?.username || 'Artiste Synaura';
            }
          }
        }
      }
    }
  } catch {
    // La carte garde un rendu Synaura même si une ressource est temporairement indisponible.
  }

  return new ImageResponse((
    <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: '#111111', color: '#F7F6F3', fontFamily: 'Inter, Arial, sans-serif' }}>
      {media ? <img src={media} width={1200} height={630} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} /> : null}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'rgba(17,17,17,0.86)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', width: 12, background: '#7357C6' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', width: 260, height: 10, background: '#4A9EAA' }} />
      <div style={{ position: 'absolute', right: 0, bottom: 0, display: 'flex', width: 180, height: 10, background: '#D96D63' }} />
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '58px 68px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><div style={{ display: 'flex', width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', background: '#F7F6F3', color: '#111111', fontSize: 23, fontWeight: 900 }}>S</div><span style={{ display: 'flex', fontSize: 27, fontWeight: 900 }}>Synaura</span></div>
          <span style={{ display: 'flex', color: 'rgba(247,246,243,0.58)', fontSize: 18, fontWeight: 800 }}>Publication musicale</span>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 44 }}>
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ display: 'flex', width: 54, height: 54, overflow: 'hidden', borderRadius: 27, alignItems: 'center', justifyContent: 'center', background: '#7357C6', fontSize: 22, fontWeight: 900 }}>{avatar ? <img src={avatar} width={54} height={54} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : author.slice(0, 1).toUpperCase()}</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ display: 'flex', fontSize: 25, fontWeight: 900 }}>{author}</span><span style={{ display: 'flex', marginTop: 3, color: 'rgba(247,246,243,0.5)', fontSize: 17, fontWeight: 700 }}>@{username}</span></div>
            </div>
            <span style={{ display: 'flex', maxWidth: 820, marginTop: 28, fontSize: 43, lineHeight: 1.15, fontWeight: 850 }}>{content}</span>
            <span style={{ display: 'flex', marginTop: 28, color: 'rgba(247,246,243,0.5)', fontSize: 17, fontWeight: 800 }}>{likes} j’aime · {comments} commentaires</span>
          </div>
          {trackTitle && media ? <div style={{ display: 'flex', width: 270, flexDirection: 'column', borderRadius: 18, padding: 13, background: 'rgba(247,246,243,0.09)', border: '1px solid rgba(247,246,243,0.14)' }}><img src={media} width={244} height={244} style={{ width: 244, height: 244, borderRadius: 13, objectFit: 'cover' }} /><span style={{ display: 'flex', marginTop: 12, fontSize: 20, fontWeight: 900 }}>{trackTitle}</span><span style={{ display: 'flex', marginTop: 4, color: 'rgba(247,246,243,0.52)', fontSize: 15, fontWeight: 700 }}>{trackArtist}</span></div> : null}
        </div>
      </div>
    </div>
  ), { ...size, headers: { 'Cache-Control': 'public, max-age=180, stale-while-revalidate=1800' } });
}
