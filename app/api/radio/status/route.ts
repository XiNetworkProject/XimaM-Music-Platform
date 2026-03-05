// app/api/radio/status/route.ts
import { NextRequest, NextResponse } from "next/server";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

const STATIONS: Record<string, {
  name: string;
  description: string;
  streamUrl: string;
  icyHost: string;
  icyPort: number;
}> = {
  mixx_party: {
    name: 'Mixx Party',
    description: 'Tous styles musicaux · 24h/24',
    streamUrl: 'http://manager11.streamradio.fr:2420/stream',
    icyHost: 'manager11.streamradio.fr',
    icyPort: 2420,
  },
  ximam: {
    name: 'XimaM Music',
    description: 'XimaM Music Radio · 24h/24',
    streamUrl: 'http://manager11.streamradio.fr:2740/stream',
    icyHost: 'manager11.streamradio.fr',
    icyPort: 2740,
  },
};

/** Tentative de récupération des métadonnées Icecast via /status-json.xsl */
async function fetchIcecastMeta(host: string, port: number): Promise<{
  title: string | null;
  artist: string | null;
  listeners: number | null;
} | null> {
  const baseUrl = `http://${host}:${port}`;
  const endpoints = [
    `${baseUrl}/status-json.xsl`,
    `${baseUrl}/status.json`,
    `${baseUrl}/7.html`,          // Shoutcast v1 fallback
  ];

  for (const url of endpoints) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 Synaura/1.0' },
      });
      clearTimeout(tid);

      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';

      // Icecast JSON
      if (ct.includes('json') || url.includes('json')) {
        const json = await res.json().catch(() => null);
        if (!json) continue;

        // Icecast 2.x: { icestats: { source: {...} | [...] } }
        const src = json?.icestats?.source;
        const mount = Array.isArray(src) ? src[0] : src;
        if (mount) {
          const rawTitle = String(mount.title || mount.song || '').trim();
          let title: string | null = null;
          let artist: string | null = null;
          if (rawTitle.includes(' - ')) {
            const parts = rawTitle.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          } else if (rawTitle) {
            title = rawTitle;
          }
          return {
            title,
            artist,
            listeners: parseInt(mount.listeners ?? mount.listener_count) || null,
          };
        }
      }

      // Shoutcast v1 7.html: "listeners,maxlisteners,uniquelisteners,bitrate,status,songtitle,servergenre"
      if (url.includes('7.html')) {
        const text = await res.text().catch(() => '');
        const parts = text.split(',');
        if (parts.length >= 6) {
          const rawTitle = parts.slice(5).join(',').trim();
          let title: string | null = rawTitle || null;
          let artist: string | null = null;
          if (rawTitle.includes(' - ')) {
            const p = rawTitle.split(' - ');
            artist = p[0].trim();
            title = p.slice(1).join(' - ').trim();
          }
          return {
            title,
            artist,
            listeners: parseInt(parts[0]) || null,
          };
        }
      }
    } catch {
      // continuer avec le prochain endpoint
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const stationParam = (req.nextUrl.searchParams.get('station') || 'mixx_party').toLowerCase();
  const station = STATIONS[stationParam] ? stationParam : 'mixx_party';
  const cfg = STATIONS[station];

  try {
    const meta = await fetchIcecastMeta(cfg.icyHost, cfg.icyPort);

    const radioData = {
      name: cfg.name,
      description: cfg.description,
      status: 'LIVE',
      isOnline: true,
      currentTrack: {
        title: meta?.title || cfg.name,
        artist: meta?.artist || cfg.name,
        genre: 'Electronic',
        album: `${cfg.name} Radio`,
      },
      stats: {
        listeners: meta?.listeners ?? 0,
        bitrate: 128,
        uptime: '24h/24',
        quality: 'Standard',
      },
      lastUpdate: new Date().toISOString(),
      streamUrl: cfg.streamUrl,
    };

    return NextResponse.json(
      { success: true, data: radioData, available: true, source: meta ? 'icecast' : 'stream' },
      { headers: CORS }
    );
  } catch (err: any) {
    const radioData = {
      name: cfg.name,
      description: cfg.description,
      status: 'LIVE',
      isOnline: true,
      currentTrack: {
        title: cfg.name,
        artist: cfg.name,
        genre: 'Electronic',
        album: `${cfg.name} Radio`,
      },
      stats: { listeners: 0, bitrate: 128, uptime: '24h/24', quality: 'Standard' },
      lastUpdate: new Date().toISOString(),
      streamUrl: cfg.streamUrl,
    };
    return NextResponse.json(
      { success: true, data: radioData, available: true, source: 'fallback', error: err.message },
      { headers: CORS }
    );
  }
}
