import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = 'Profil artiste Synaura';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { username: string } }) {
  let profileId = '';
  let name = params.username;
  let username = params.username;
  let avatar: string | null = null;
  let banner: string | null = null;
  let bio = '';
  let trackCount = 0;
  let followers = 0;
  let verified = false;

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, name, username, avatar, banner, bio, follower_count, is_verified')
      .eq('username', params.username)
      .maybeSingle();

    if (profile) {
      profileId = profile.id;
      name = profile.name || profile.username;
      username = profile.username;
      avatar = profile.avatar;
      banner = profile.banner;
      bio = String(profile.bio || '').slice(0, 150);
      followers = Number(profile.follower_count || 0);
      verified = Boolean(profile.is_verified);
    }

    if (profileId) {
      const { count } = await supabaseAdmin
        .from('tracks')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', profileId)
        .eq('is_public', true);
      trackCount = count || 0;
    }
  } catch {
    // The profile page remains shareable even if counters are temporarily unavailable.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#111111',
          color: '#F7F6F3',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        {banner || avatar ? (
          <img
            src={banner || avatar || ''}
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.24,
              transform: 'scale(1.06)',
            }}
          />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'linear-gradient(90deg, rgba(17,17,17,0.98) 0%, rgba(17,17,17,0.91) 56%, rgba(17,17,17,0.72) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', width: 14, background: '#7357C6' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', width: 310, height: 12, background: '#4A9EAA' }} />
        <div style={{ position: 'absolute', right: 0, bottom: 0, display: 'flex', width: 180, height: 12, background: '#D96D63' }} />

        <div style={{ position: 'absolute', left: 66, right: 66, top: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ display: 'flex', width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', background: '#F7F6F3', color: '#111111', fontSize: 22, fontWeight: 950 }}>S</div>
            <span style={{ display: 'flex', fontSize: 26, fontWeight: 900 }}>Synaura</span>
          </div>
          <div style={{ display: 'flex', border: '1px solid rgba(247,246,243,0.16)', borderRadius: 999, padding: '10px 17px', background: 'rgba(247,246,243,0.08)', color: 'rgba(247,246,243,0.72)', fontSize: 17, fontWeight: 850 }}>
            Profil artiste
          </div>
        </div>

        <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', gap: 52, padding: '116px 70px 52px' }}>
          <div style={{ display: 'flex', width: 220, height: 220, flexShrink: 0, overflow: 'hidden', borderRadius: 110, border: '3px solid rgba(247,246,243,0.18)', background: '#23211F', boxShadow: '0 28px 80px rgba(0,0,0,0.44)' }}>
            {avatar ? (
              <img src={avatar} width={220} height={220} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#7357C6', color: '#F7F6F3', fontSize: 82, fontWeight: 950 }}>
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <span style={{ display: 'flex', maxWidth: 690, fontSize: 66, lineHeight: 0.98, fontWeight: 950 }}>{name}</span>
              {verified ? <span style={{ display: 'flex', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', background: '#4A9EAA', color: '#111111', fontSize: 17, fontWeight: 950 }}>V</span> : null}
            </div>
            <span style={{ display: 'flex', marginTop: 13, color: 'rgba(247,246,243,0.56)', fontSize: 25, fontWeight: 800 }}>@{username}</span>
            {bio ? <span style={{ display: 'flex', maxWidth: 700, marginTop: 22, color: 'rgba(247,246,243,0.74)', fontSize: 24, lineHeight: 1.35, fontWeight: 650 }}>{bio}</span> : null}

            <div style={{ display: 'flex', gap: 14, marginTop: 32 }}>
              <div style={{ display: 'flex', minWidth: 160, flexDirection: 'column', borderRadius: 18, padding: '15px 20px', background: 'rgba(247,246,243,0.09)', border: '1px solid rgba(247,246,243,0.13)' }}>
                <span style={{ display: 'flex', fontSize: 28, fontWeight: 950 }}>{trackCount}</span>
                <span style={{ display: 'flex', marginTop: 3, color: 'rgba(247,246,243,0.48)', fontSize: 15, fontWeight: 800 }}>morceaux publics</span>
              </div>
              <div style={{ display: 'flex', minWidth: 160, flexDirection: 'column', borderRadius: 18, padding: '15px 20px', background: 'rgba(247,246,243,0.09)', border: '1px solid rgba(247,246,243,0.13)' }}>
                <span style={{ display: 'flex', fontSize: 28, fontWeight: 950 }}>{followers}</span>
                <span style={{ display: 'flex', marginTop: 3, color: 'rgba(247,246,243,0.48)', fontSize: 15, fontWeight: 800 }}>abonnés</span>
              </div>
            </div>
          </div>
        </div>

        <span style={{ position: 'absolute', left: 70, bottom: 24, display: 'flex', color: 'rgba(247,246,243,0.42)', fontSize: 15, fontWeight: 800 }}>
          Écouter et découvrir sur Synaura
        </span>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    },
  );
}
