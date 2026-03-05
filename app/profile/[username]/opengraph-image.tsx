import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = 'Synaura Profile';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { username: string } }) {
  let name = params.username;
  let username = params.username;
  let avatar: string | null = null;
  let bio = '';
  let trackCount = 0;
  let followers = 0;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, username, avatar, bio, followers_count')
      .eq('username', params.username)
      .single();

    if (profile) {
      name = profile.name || profile.username;
      username = profile.username;
      avatar = profile.avatar;
      bio = profile.bio || '';
      followers = profile.followers_count || 0;
    }

    const { count } = await supabase
      .from('tracks')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', (await supabase.from('profiles').select('id').eq('username', params.username).single()).data?.id || '')
      .eq('is_public', true);
    trackCount = count || 0;
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
        <div style={{ position: 'absolute', top: -120, left: '50%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)', display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '60px', gap: 24 }}>
          {/* Avatar */}
          <div style={{ width: 160, height: 160, borderRadius: '50%', overflow: 'hidden', display: 'flex', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '3px solid rgba(255,255,255,0.15)' }}>
            {avatar ? (
              <img src={avatar} width={160} height={160} style={{ objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4c1d95, #7c3aed)' }}>
                <span style={{ fontSize: 64, color: '#fff', fontWeight: 800 }}>{name[0]?.toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Name */}
          <div style={{ fontSize: 48, fontWeight: 800, color: '#ffffff', display: 'flex' }}>{name}</div>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', display: 'flex' }}>@{username}</div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, marginTop: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{trackCount}</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>tracks</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{followers}</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>abonnés</span>
            </div>
          </div>

          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>S</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Synaura</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
