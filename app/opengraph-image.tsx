import { ImageResponse } from 'next/og';
import FennecMark from '@/components/celestial/FennecMark';

export const runtime = 'edge';
export const alt = 'Synaura — La musique devient un monde';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#f6ecdc', background: '#080e1c', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #080e1c 20%, #1d4050 65%, #343349)', opacity: 1 }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:24, color:'#a9caff' }}><FennecMark width={105} height={105}/><span style={{fontSize:100,fontStyle:'italic',letterSpacing:-5,color:'#f6ecdc'}}>Synaura</span></div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 45, fontWeight: 400, letterSpacing: -1, color: '#e6c697' }}>La musique, un peu plus près.</div>
        <div style={{display:'flex',marginTop:36,fontSize:18,letterSpacing:5,color:'#bac3d3'}}>ÉCOUTER · CRÉER · SE RENCONTRER</div>
      </div>
    </div>,
    size,
  );
}
