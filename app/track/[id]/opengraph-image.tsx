import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = 'Synaura Track';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  const { id } = params;
  const isAI = id.startsWith('ai-');
  const cleanId = isAI ? id.slice(3) : id;

  let title = 'Synaura';
  let artist = 'Artiste';
  let coverUrl: string | null = null;
  let genre = '';

  try {
    if (isAI) {
      const { data } = await supabase
        .from('ai_generated_tracks')
        .select('title, cover_url, genre, style, generation_id')
        .eq('id', cleanId)
        .single();
      if (data) {
        title = data.title || 'Création IA';
        coverUrl = data.cover_url;
        genre = data.genre || data.style || '';
        const { data: gen } = await supabase
          .from('ai_generations')
          .select('profiles!ai_generations_user_id_fkey(name, username)')
          .eq('id', data.generation_id)
          .single();
        artist = (gen as any)?.profiles?.name || (gen as any)?.profiles?.username || 'Artiste IA';
      }
    } else {
      const { data: track } = await supabase
        .from('tracks')
        .select('title, cover_url, artist_name, creator_name, genre, creator_id')
        .eq('id', id)
        .single();
      if (track) {
        title = track.title;
        coverUrl = track.cover_url;
        genre = track.genre?.[0] || '';
        if (track.creator_id) {
          const { data: p } = await supabase.from('profiles').select('name').eq('id', track.creator_id).single();
          artist = p?.name || track.artist_name || track.creator_name || 'Artiste';
        } else {
          artist = track.artist_name || track.creator_name || 'Artiste';
        }
      }
    }
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #0f0a1a 0%, #1a1025 30%, #0d0d1a 100%)',
          position: 'relative',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Decorative gradient orbs */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)', display: 'flex' }} />

        {/* Content */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '60px 80px', width: '100%', gap: 60 }}>
          {/* Cover */}
          <div style={{ width: 320, height: 320, borderRadius: 20, overflow: 'hidden', flexShrink: 0, display: 'flex', boxShadow: '0 25px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {coverUrl ? (
              <img src={coverUrl} width={320} height={320} style={{ objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 320, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4c1d95, #7c3aed)' }}>
                <span style={{ fontSize: 80, opacity: 0.3 }}>♪</span>
              </div>
            )}
          </div>

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 0 }}>
            {isAI && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>Création IA</span>
              </div>
            )}
            <div style={{ fontSize: 48, fontWeight: 800, color: '#ffffff', lineHeight: 1.1, display: 'flex', maxWidth: 600, wordBreak: 'break-word' }}>
              {title.length > 50 ? title.slice(0, 50) + '…' : title}
            </div>
            <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
              {artist}
            </div>
            {genre && (
              <div style={{ display: 'flex', marginTop: 8 }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 16px' }}>{genre}</span>
              </div>
            )}

            {/* Synaura branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 32 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>S</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Synaura</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
