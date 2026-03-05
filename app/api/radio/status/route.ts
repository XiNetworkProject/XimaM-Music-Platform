// app/api/radio/status/route.ts
import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const STATIONS: Record<string, {
  name: string;
  description: string;
  streamUrl: string;
  shoutcastPort: number;
  host: string;
}> = {
  mixx_party: {
    name: 'Mixx Party Radio',
    description: 'Radio tous styles musicaux en continu 24h/24',
    streamUrl: 'https://manager11.streamradio.fr:2425/stream',
    host: 'manager11.streamradio.fr',
    shoutcastPort: 2425,
  },
  ximam: {
    name: 'XimaM Music Radio',
    description: 'Radio XimaM en continu 24h/24',
    streamUrl: 'https://manager11.streamradio.fr:2745/stream',
    host: 'manager11.streamradio.fr',
    shoutcastPort: 2745,
  },
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

/** Parse le format Shoutcast v1 : 7.html
 *  Body: CurrentListeners,StreamStatus,PeakListeners,MaxListeners,UniqueListeners,Bitrate,SongTitle
 */
function parseShoutcastV1(html: string): { listeners: number; bitrate: number; title: string; artist: string; isOnline: boolean } | null {
  try {
    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!match) return null;
    const body = match[1].trim();
    // SongTitle peut contenir des virgules, donc on split en 7 parties max
    const parts = body.split(',');
    if (parts.length < 6) return null;

    const listeners = parseInt(parts[0]) || 0;
    const status = parseInt(parts[1]); // 1 = online
    const bitrate = parseInt(parts[5]) || 128;
    const songRaw = parts.slice(6).join(',').trim(); // titre complet (peut contenir des virgules)

    let title = songRaw;
    let artist = '';
    // Format classique : "Artiste - Titre"
    const sep = songRaw.includes(' - ') ? ' - ' : songRaw.includes(' – ') ? ' – ' : null;
    if (sep) {
      const idx = songRaw.indexOf(sep);
      artist = songRaw.slice(0, idx).trim();
      title = songRaw.slice(idx + sep.length).trim();
    }

    return { listeners, bitrate, title: title || songRaw || '', artist, isOnline: status === 1 };
  } catch {
    return null;
  }
}

/** Parse le format Shoutcast v2 JSON (/stats?sid=1&json=1) */
function parseShoutcastV2Json(data: any): { listeners: number; bitrate: number; title: string; artist: string; isOnline: boolean } | null {
  try {
    if (!data || typeof data !== 'object') return null;
    const listeners = parseInt(data.listeners ?? data.currentlisteners) || 0;
    const bitrate = parseInt(data.bitrate ?? data.bitratekbps) || 128;
    const songRaw = String(data.songtitle ?? data.songTitle ?? data.title ?? '').trim();
    const isOnline = data.streamstatus === 1 || data.streamStatus === 1 || data.online === true || listeners > 0;

    let title = songRaw;
    let artist = '';
    const sep = songRaw.includes(' - ') ? ' - ' : songRaw.includes(' – ') ? ' – ' : null;
    if (sep) {
      const idx = songRaw.indexOf(sep);
      artist = songRaw.slice(0, idx).trim();
      title = songRaw.slice(idx + sep.length).trim();
    }

    return { listeners, bitrate, title: title || songRaw || '', artist, isOnline };
  } catch {
    return null;
  }
}

/** Tente de récupérer les métadonnées de la station avec timeout */
async function fetchMetadata(url: string, timeoutMs = 4000): Promise<{ ok: boolean; text?: string; json?: any; contentType?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SynauraRadio/1.0)',
        'Accept': 'application/json, text/html, */*',
        'Icy-MetaData': '1',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false };
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    let json: any = undefined;
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      try { json = JSON.parse(text); } catch {}
    } else {
      try { json = JSON.parse(text); } catch {} // tenter quand même
    }
    return { ok: true, text, json, contentType };
  } catch {
    return { ok: false };
  }
}

function simulatedListeners(): number {
  const h = new Date().getHours();
  const dow = new Date().getDay();
  let base = 400;
  if (h >= 6 && h < 9) base = 1200;
  else if (h >= 9 && h < 12) base = 800;
  else if (h >= 12 && h < 14) base = 1000;
  else if (h >= 14 && h < 18) base = 600;
  else if (h >= 18 && h < 22) base = 1500;
  else if (h >= 22) base = 1800;
  if (dow === 0 || dow === 6) base = Math.floor(base * 1.3);
  const variation = Math.floor(base * 0.15 * (Math.random() - 0.5));
  return Math.max(50, base + variation);
}

function simulatedTrack(stationName: string): { title: string; artist: string; genre: string } {
  const h = new Date().getHours();
  const tracks: { title: string; artist: string; genre: string }[] = h < 6
    ? [{ title: 'Deep Night Session', artist: 'Nocturnal DJ', genre: 'Ambient' }]
    : h < 12
    ? [{ title: 'Morning Vibes', artist: 'Sunrise DJ', genre: 'Chill House' }]
    : h < 18
    ? [{ title: 'Afternoon Groove', artist: 'Daylight Mix', genre: 'Deep House' }]
    : [{ title: 'Night Drive', artist: 'Midnight Crew', genre: 'Dance' }];
  return tracks[0];
}

function buildResponse(
  stationCfg: typeof STATIONS[string],
  meta: { listeners: number; bitrate: number; title: string; artist: string; isOnline: boolean } | null,
  sourceLabel: string,
): object {
  const track = meta
    ? { title: meta.title || stationCfg.name, artist: meta.artist || stationCfg.name, genre: 'Electronic', album: `${stationCfg.name} Collection` }
    : (() => { const t = simulatedTrack(stationCfg.name); return { ...t, album: `${stationCfg.name} Collection` }; })();

  return {
    success: true,
    data: {
      name: stationCfg.name,
      description: stationCfg.description,
      status: 'LIVE',
      isOnline: meta ? meta.isOnline : true,
      currentTrack: track,
      stats: {
        listeners: meta ? meta.listeners : simulatedListeners(),
        bitrate: meta ? meta.bitrate : 192,
        uptime: '24h/24',
        quality: (meta?.bitrate ?? 192) >= 192 ? 'HD' : 'Standard',
      },
      technical: {
        serverName: `${stationCfg.name} Server`,
        serverDescription: 'Radio en boucle continue',
        contentType: 'audio/mpeg',
        serverType: 'Shoutcast/Icecast',
        serverVersion: '2.x',
      },
      lastUpdate: new Date().toISOString(),
      streamUrl: stationCfg.streamUrl,
    },
    source: sourceLabel,
    // toujours true : le stream est accessible même sans métadonnées
    available: true,
  };
}

export async function GET(req: NextRequest) {
  const stationKey = (req.nextUrl.searchParams.get('station') || 'mixx_party').toLowerCase();
  const stationCfg = STATIONS[stationKey] ?? STATIONS['mixx_party'];
  const { host, shoutcastPort } = stationCfg;
  const base = `https://${host}:${shoutcastPort}`;

  // Ordre de tentative : Shoutcast v1 (7.html) → Shoutcast v2 JSON → Icecast JSON → fallback simulé
  const attempts: Array<{ url: string; parser: 'v1html' | 'v2json' | 'icecast' }> = [
    { url: `${base}/7.html`, parser: 'v1html' },
    { url: `${base}/stats?sid=1&json=1`, parser: 'v2json' },
    { url: `${base}/statistics`, parser: 'v2json' },
    { url: `${base}/status-json.xsl`, parser: 'icecast' },
  ];

  for (const attempt of attempts) {
    const result = await fetchMetadata(attempt.url);
    if (!result.ok) continue;

    let meta: ReturnType<typeof parseShoutcastV1> = null;

    if (attempt.parser === 'v1html' && result.text) {
      meta = parseShoutcastV1(result.text);
    } else if (attempt.parser === 'v2json' && result.json) {
      meta = parseShoutcastV2Json(result.json);
    } else if (attempt.parser === 'icecast' && result.json) {
      // Format Icecast : icestats.source
      try {
        const src = result.json?.icestats?.source;
        const source = Array.isArray(src) ? src[0] : src;
        if (source) {
          const songRaw = String(source.title ?? '').trim();
          let title = songRaw, artist = '';
          const sep = songRaw.includes(' - ') ? ' - ' : null;
          if (sep) {
            const idx = songRaw.indexOf(sep);
            artist = songRaw.slice(0, idx).trim();
            title = songRaw.slice(idx + sep.length).trim();
          }
          meta = {
            listeners: parseInt(source.listeners ?? 0) || 0,
            bitrate: parseInt(source.bitrate ?? 128) || 128,
            title,
            artist,
            isOnline: true,
          };
        }
      } catch {}
    }

    if (meta) {
      return NextResponse.json(buildResponse(stationCfg, meta, attempt.parser), { headers: CORS_HEADERS });
    }
  }

  // Fallback simulé — stream toujours accessible (available: true)
  return NextResponse.json(buildResponse(stationCfg, null, 'simulated'), { headers: CORS_HEADERS });
}
