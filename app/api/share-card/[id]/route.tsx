import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canViewAiTrack, canViewTrack } from '@/lib/publicTracks';
import {
  formatShareCardDuration,
  getShareCardFormat,
  makeDecorativeWaveform,
  sampleShareWaveform,
  sanitizeShareCardText,
} from '@/lib/shareCard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ShareTrack = {
  id: string;
  refId: string;
  type: 'track' | 'ai_track';
  title: string;
  artist: string;
  coverUrl: string | null;
  duration: number;
  plays: number;
};

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.synaura.fr').replace(/\/$/, '');

function compactNumber(value: number) {
  const safe = Math.max(0, Number(value || 0));
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M`;
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(1)}K`;
  return String(Math.round(safe));
}

async function loadTrack(id: string): Promise<ShareTrack | null> {
  const isAi = id.startsWith('ai-');
  const refId = isAi ? id.slice(3) : id;

  if (isAi) {
    const { data } = await supabaseAdmin
      .from('ai_tracks')
      .select('id, title, image_url, audio_url, duration, play_count, is_public, generation:ai_generations!inner(user_id, is_public, status)')
      .eq('id', refId)
      .maybeSingle();
    if (!data || !canViewAiTrack(data, null)) return null;

    const userId = (data as any).generation?.user_id;
    let artist = 'Artiste Synaura';
    if (userId) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('name, username').eq('id', userId).maybeSingle();
      artist = profile?.name || profile?.username || artist;
    }

    return {
      id: `ai-${data.id}`,
      refId,
      type: 'ai_track',
      title: data.title || 'Creation IA',
      artist,
      coverUrl: data.image_url || null,
      duration: Number(data.duration || 0),
      plays: Number(data.play_count || 0),
    };
  }

  const { data: track } = await supabaseAdmin
    .from('tracks')
    .select('id, title, creator_id, artist_name, creator_name, cover_url, audio_url, duration, plays, is_public')
    .eq('id', refId)
    .maybeSingle();
  if (!track || !canViewTrack(track, null)) return null;

  let artist = track.artist_name || track.creator_name || 'Artiste Synaura';
  if (track.creator_id) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('name, username').eq('id', track.creator_id).maybeSingle();
    artist = profile?.name || profile?.username || artist;
  }

  return {
    id: track.id,
    refId,
    type: 'track',
    title: track.title || 'Son Synaura',
    artist,
    coverUrl: track.cover_url || null,
    duration: Number(track.duration || 0),
    plays: Number(track.plays || 0),
  };
}

async function loadWaveform(track: ShareTrack, count: number) {
  try {
    const { data } = await supabaseAdmin
      .from('track_waveforms')
      .select('peaks')
      .eq('track_id', track.refId)
      .eq('track_type', track.type)
      .maybeSingle();
    const sampled = sampleShareWaveform(data?.peaks, count);
    if (sampled.length) return sampled;
  } catch {
    // The share card still works if waveform cache is not available yet.
  }
  return makeDecorativeWaveform(`${track.id}:${track.title}:${track.artist}`, count);
}

function Waveform({ bars, height }: { bars: number[]; height: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', height }}>
      {bars.map((value, index) => (
        <div
          key={`${index}-${value}`}
          style={{
            display: 'flex',
            width: 9,
            height: Math.max(18, Math.round(value * height)),
            borderRadius: 999,
            background: index % 7 === 0 ? '#D96D63' : index % 5 === 0 ? '#4A9EAA' : 'rgba(247,246,243,0.74)',
          }}
        />
      ))}
    </div>
  );
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const format = getShareCardFormat(request.nextUrl.searchParams.get('format'));
  const personalText = sanitizeShareCardText(request.nextUrl.searchParams.get('text'), 112);
  const track = await loadTrack(params.id);
  if (!track) {
    return NextResponse.json(
      { error: 'Morceau introuvable ou non public.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const resolvedTrack = track;
  const isBanner = format.id === 'banner';
  const isStory = format.id === 'story';
  const barCount = isBanner ? 56 : isStory ? 42 : 38;
  const bars = await loadWaveform(resolvedTrack, barCount);
  const trackUrl = `${BASE_URL}/track/${encodeURIComponent(resolvedTrack.id)}`;
  const duration = formatShareCardDuration(resolvedTrack.duration);
  const coverSize = isBanner ? 430 : isStory ? 710 : 560;
  const titleSize = isBanner ? 76 : isStory ? 82 : 66;
  const sidePadding = isBanner ? 86 : isStory ? 78 : 70;

  const cover = resolvedTrack.coverUrl ? (
    <img src={resolvedTrack.coverUrl} width={coverSize} height={coverSize} style={{ objectFit: 'cover' }} />
  ) : (
    <div
      style={{
        display: 'flex',
        width: coverSize,
        height: coverSize,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #7357C6, #4A9EAA)',
        color: 'rgba(247,246,243,0.7)',
        fontSize: coverSize * 0.26,
        fontWeight: 900,
      }}
    >
      S
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#111111',
          color: '#F7F6F3',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        {resolvedTrack.coverUrl ? (
          <img
            src={resolvedTrack.coverUrl}
            width={format.width}
            height={format.height}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.22,
              transform: 'scale(1.12)',
            }}
          />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'linear-gradient(145deg, rgba(17,17,17,0.82), rgba(17,17,17,0.96) 58%, rgba(34,24,46,0.98))' }} />
        <div style={{ position: 'absolute', left: -220, top: -180, display: 'flex', width: 620, height: 620, borderRadius: 310, background: 'rgba(115,87,198,0.34)' }} />
        <div style={{ position: 'absolute', right: -220, bottom: -180, display: 'flex', width: 660, height: 660, borderRadius: 330, background: 'rgba(74,158,170,0.24)' }} />
        <div style={{ position: 'absolute', left: sidePadding, right: sidePadding, top: sidePadding, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', background: '#F7F6F3', color: '#111111', fontSize: 23, fontWeight: 950 }}>
              S
            </div>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 900, letterSpacing: -0.4 }}>Synaura</div>
          </div>
          <div style={{ display: 'flex', borderRadius: 999, padding: '12px 18px', background: 'rgba(247,246,243,0.11)', border: '1px solid rgba(247,246,243,0.14)', fontSize: 19, fontWeight: 900 }}>
            Carte partage
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: isBanner ? 'row' : 'column',
            alignItems: isBanner ? 'center' : 'center',
            justifyContent: 'center',
            gap: isBanner ? 78 : isStory ? 58 : 38,
            width: '100%',
            height: '100%',
            padding: isBanner ? `120px ${sidePadding}px 90px` : `${sidePadding + 68}px ${sidePadding}px ${sidePadding}px`,
          }}
        >
          <div style={{ display: 'flex', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: -26, display: 'flex', borderRadius: 58, background: 'rgba(217,109,99,0.20)' }} />
            <div style={{ position: 'relative', display: 'flex', width: coverSize, height: coverSize, overflow: 'hidden', borderRadius: isBanner ? 42 : 48, border: '2px solid rgba(247,246,243,0.14)', boxShadow: '0 36px 120px rgba(0,0,0,0.48)' }}>
              {cover}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: isBanner ? 1 : '0 0 auto', width: isBanner ? undefined : '100%', maxWidth: isBanner ? 850 : 900, alignItems: isBanner ? 'flex-start' : 'center' }}>
            {personalText ? (
              <div style={{ display: 'flex', marginBottom: isStory ? 30 : 22, maxWidth: isBanner ? 760 : 850, borderRadius: 28, padding: '18px 24px', background: 'rgba(247,246,243,0.11)', border: '1px solid rgba(247,246,243,0.13)', color: 'rgba(247,246,243,0.82)', fontSize: isBanner ? 28 : 30, lineHeight: 1.25, fontWeight: 760, textAlign: isBanner ? 'left' : 'center' }}>
                {personalText}
              </div>
            ) : null}
            <div style={{ display: 'flex', maxWidth: isBanner ? 820 : 900, color: '#F7F6F3', fontSize: titleSize, lineHeight: 0.95, fontWeight: 950, letterSpacing: -2.2, textAlign: isBanner ? 'left' : 'center' }}>
              {resolvedTrack.title}
            </div>
            <div style={{ display: 'flex', marginTop: 22, color: 'rgba(247,246,243,0.72)', fontSize: isBanner ? 36 : 34, fontWeight: 850, textAlign: isBanner ? 'left' : 'center' }}>
              {resolvedTrack.artist}
            </div>
            <div style={{ display: 'flex', marginTop: 20, gap: 14, alignItems: 'center', color: 'rgba(247,246,243,0.58)', fontSize: 22, fontWeight: 850 }}>
              {duration ? <span>{duration}</span> : null}
              {duration ? <span>•</span> : null}
              <span>{compactNumber(resolvedTrack.plays)} ecoutes</span>
            </div>

            <div style={{ display: 'flex', width: '100%', maxWidth: isBanner ? 720 : 820, marginTop: isStory ? 62 : 42, padding: isBanner ? '26px 28px' : '28px 30px', borderRadius: 34, background: 'rgba(247,246,243,0.10)', border: '1px solid rgba(247,246,243,0.13)', flexDirection: 'column', gap: 22 }}>
              <Waveform bars={bars} height={isBanner ? 104 : 112} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, color: 'rgba(247,246,243,0.68)', fontSize: 21, fontWeight: 900 }}>
                <span>Ecouter sur Synaura</span>
                <span style={{ color: '#D96D63' }}>{trackUrl.replace(/^https?:\/\//, '')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: format.width,
      height: format.height,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    },
  );
}
