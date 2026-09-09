import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Synaura — La musique devient un monde';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#F7F6F3', background: '#09090c', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', width: 760, height: 760, borderRadius: 999, background: 'radial-gradient(circle at 34% 28%, #ffffff 0%, #ffffff 3%, #d96d63 12%, #7357c6 44%, #4a9eaa 70%, rgba(9, 9, 12, 0) 73%)', opacity: 0.78 }} />
      <div style={{ position: 'absolute', width: 920, height: 400, borderRadius: '50%', border: '2px solid rgba(247,246,243,.18)', transform: 'rotate(-9deg)' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', fontSize: 142, fontWeight: 900, letterSpacing: -12 }}>Synaura</div>
        <div style={{ display: 'flex', marginTop: 22, fontSize: 30, fontWeight: 700, color: 'rgba(247,246,243,.76)' }}>La musique devient un monde.</div>
      </div>
    </div>,
    size,
  );
}
