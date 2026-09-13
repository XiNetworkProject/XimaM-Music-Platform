import { ImageResponse } from 'next/og';
import { SYNAURA_V2_REFERENCE } from '@/lib/brandV2';

export const runtime = 'edge';
export const alt = 'Synaura — La musique devient un monde';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#F7F6F3', background: '#09090c', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #06080e, #191f2c)', opacity: 1 }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <img src={SYNAURA_V2_REFERENCE} alt="Synaura" width="375" height="105" style={{ objectFit: 'contain' }} />
        <div style={{ display: 'flex', marginTop: 54, fontSize: 54, fontWeight: 400, letterSpacing: -2, color: '#eff1f8' }}>La musique, un peu plus près.</div>
      </div>
    </div>,
    size,
  );
}
