import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase';
import { getEditorialCollectionBySlug, isUuidLike } from '@/lib/editorialCollections';

export const runtime = 'nodejs';
export const alt = 'Playlist Synaura';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  let title = 'Playlist Synaura';
  let description = 'Une sélection musicale à écouter sur Synaura.';
  let curator = 'Synaura';
  let cover: string | null = null;
  let trackCount = 0;

  try {
    const collection = isUuidLike(params.id) ? null : await getEditorialCollectionBySlug(params.id);
    const playlistId = collection?.playlistId || params.id;
    if (isUuidLike(playlistId)) {
      const { data: playlist } = await supabaseAdmin.from('playlists').select('id, name, description, cover_url, creator_id, is_public').eq('id', playlistId).maybeSingle();
      if (playlist && (playlist.is_public || collection?.isPublished)) {
        title = collection?.title || playlist.name || title;
        description = collection?.subtitle || playlist.description || description;
        cover = collection?.coverUrl || collection?.bannerUrl || playlist.cover_url || null;
        if (playlist.creator_id) {
          const { data: owner } = await supabaseAdmin.from('profiles').select('name, username, artist_name').eq('id', playlist.creator_id).maybeSingle();
          curator = owner?.artist_name || owner?.name || owner?.username || curator;
        }
        const { data: rows } = await supabaseAdmin.from('playlist_tracks').select('tracks!inner(id, cover_url, is_public, audio_url)').eq('playlist_id', playlist.id).eq('tracks.is_public', true).not('tracks.audio_url', 'is', null);
        const publicTracks = (rows || []).map((row: any) => row.tracks).filter(Boolean);
        trackCount = publicTracks.length;
        cover = cover || publicTracks.find((track: any) => track.cover_url)?.cover_url || null;
      }
    }
  } catch {
    // Le lien reste partageable avec un visuel de marque si la playlist est en maintenance.
  }

  return new ImageResponse((
    <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: '#111111', color: '#F7F6F3', fontFamily: 'Inter, Arial, sans-serif' }}>
      {cover ? <img src={cover} width={1200} height={630} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.22 }} /> : null}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'rgba(17,17,17,0.86)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', width: 12, background: '#4A9EAA' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', width: 260, height: 10, background: '#7357C6' }} />
      <div style={{ position: 'absolute', right: 0, bottom: 0, display: 'flex', width: 180, height: 10, background: '#D96D63' }} />
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 62, padding: '58px 72px' }}>
        <div style={{ position: 'relative', display: 'flex', width: 430, height: 430, flexShrink: 0, overflow: 'hidden', borderRadius: 28, background: '#23211F', border: '2px solid rgba(247,246,243,0.14)' }}>{cover ? <img src={cover} width={430} height={430} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#7357C6', fontSize: 118, fontWeight: 900 }}>S</span>}</div>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}><div style={{ display: 'flex', width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', background: '#F7F6F3', color: '#111111', fontSize: 22, fontWeight: 900 }}>S</div><span style={{ display: 'flex', fontSize: 25, fontWeight: 900 }}>Synaura</span></div>
          <span style={{ display: 'flex', marginTop: 34, color: '#4A9EAA', fontSize: 18, fontWeight: 900 }}>PLAYLIST</span>
          <span style={{ display: 'flex', maxWidth: 610, marginTop: 12, fontSize: 58, lineHeight: 1, fontWeight: 900 }}>{title}</span>
          <span style={{ display: 'flex', maxWidth: 590, marginTop: 20, color: 'rgba(247,246,243,0.66)', fontSize: 22, lineHeight: 1.35, fontWeight: 700 }}>{description.slice(0, 150)}</span>
          <span style={{ display: 'flex', marginTop: 30, color: 'rgba(247,246,243,0.48)', fontSize: 18, fontWeight: 800 }}>{curator} · {trackCount} titre{trackCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  ), { ...size, headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
}
