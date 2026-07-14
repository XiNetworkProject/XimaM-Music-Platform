import { ImageResponse } from 'next/og';
import { getPublicClip } from './clipData';

export const runtime = 'nodejs';
export const alt = 'Clip Synaura';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  const clip = await getPublicClip(params.id);
  const creator = clip?.creator.name || clip?.creator.username || 'Créateur Synaura';
  const title = clip?.caption || clip?.sourceTrack.title || 'Clip Synaura';
  const poster = clip?.posterUrl || clip?.sourceTrack.coverUrl || null;

  return new ImageResponse((
    <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: '#111111', color: '#F7F6F3', fontFamily: 'Inter, Arial, sans-serif' }}>
      {poster ? <img src={poster} width={1200} height={630} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.22 }} /> : null}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'rgba(17,17,17,0.86)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', width: 12, background: '#D96D63' }} />
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 58, padding: '54px 70px' }}>
        <div style={{ display: 'flex', width: 330, height: 520, overflow: 'hidden', borderRadius: 22, background: '#242120', border: '2px solid rgba(247,246,243,0.14)' }}>
          {poster ? <img src={poster} width={330} height={520} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 104, fontWeight: 900, color: '#D96D63' }}>S</span>}
        </div>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}><div style={{ display: 'flex', width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', background: '#F7F6F3', color: '#111111', fontSize: 22, fontWeight: 900 }}>S</div><span style={{ display: 'flex', fontSize: 25, fontWeight: 900 }}>Synaura</span></div>
          <span style={{ display: 'flex', marginTop: 42, color: '#D96D63', fontSize: 18, fontWeight: 900 }}>CLIP SYNAURA</span>
          <span style={{ display: 'flex', maxWidth: 650, marginTop: 14, fontSize: 55, lineHeight: 1.04, fontWeight: 900 }}>{title.slice(0, 110)}</span>
          <span style={{ display: 'flex', marginTop: 24, color: 'rgba(247,246,243,0.62)', fontSize: 22, fontWeight: 800 }}>@{clip?.creator.username || creator}</span>
          {clip?.sourceTrack ? <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36, padding: '18px 20px', borderRadius: 14, background: 'rgba(74,158,170,0.16)', border: '1px solid rgba(74,158,170,0.35)' }}><span style={{ display: 'flex', color: '#73C2CC', fontSize: 14, fontWeight: 900 }}>SON ORIGINAL</span><span style={{ display: 'flex', marginTop: 7, fontSize: 23, fontWeight: 900 }}>{clip.sourceTrack.title}</span><span style={{ display: 'flex', marginTop: 4, color: 'rgba(247,246,243,0.5)', fontSize: 16, fontWeight: 700 }}>{clip.sourceTrack.artist.name}</span></div> : null}
        </div>
      </div>
    </div>
  ), { ...size, headers: { 'Cache-Control': 'public, max-age=180, stale-while-revalidate=1800' } });
}
