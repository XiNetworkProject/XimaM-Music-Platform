// app/api/radio/status/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(req: NextRequest) {
  const stationParamRaw = req.nextUrl.searchParams.get('station') || 'mixx_party';
  const stationParam = stationParamRaw.toLowerCase();

  const STATIONS: Record<string, { name: string; description: string; streamUrl: string; metadataUrls: string[] }> = {
    mixx_party: {
      name: 'Mixx Party Radio',
      description: 'Radio électronique en continu 24h/24',
      streamUrl: 'https://stream.mixx-party.fr/listen/mixx_party/radio.mp3',
      metadataUrls: [
        // AzuraCast (now playing / listeners / bitrate)
        'https://stream.mixx-party.fr/api/nowplaying/mixx_party',
        // fallback global nowplaying (array de stations)
        'https://stream.mixx-party.fr/api/nowplaying'
      ]
    },
    ximam: {
      name: 'XimaM Radio',
      description: 'Radio XimaM en continu 24h/24',
      streamUrl: 'https://stream.mixx-party.fr/listen/ximam/radio.mp3',
      metadataUrls: [
        'https://stream.mixx-party.fr/api/nowplaying/ximam',
        'https://stream.mixx-party.fr/api/nowplaying'
      ]
    }
  };

  const station = STATIONS[stationParam] ? stationParam : 'mixx_party';
  const stationCfg = STATIONS[station];

  const norm = (s: any) =>
    String(s || '')
      .toLowerCase()
      .replace(/https?:\/\//g, '')
      .replace(/[^a-z0-9]+/g, '');

  const getStationTokens = (stationKey: string, streamUrl: string) => {
    const tokens = new Set<string>();
    const add = (v: string) => {
      const n = norm(v);
      if (n) tokens.add(n);
    };
    add(stationKey);
    add(stationKey.replace(/[_-]/g, ''));
    add(stationKey.replace(/_/g, '-'));

    try {
      const u = new URL(streamUrl);
      add(u.hostname);
      // pattern courant: /listen/<mount>/radio.mp3
      const m = u.pathname.match(/\/listen\/([^/]+)\//i);
      if (m?.[1]) {
        add(m[1]);
        add(m[1].replace(/[_-]/g, ''));
      }
    } catch {}

    // Tokens "humains" utiles
    add(stationCfg.name);
    return Array.from(tokens);
  };

  const stationTokens = getStationTokens(station, stationCfg.streamUrl);

  try {

    // Récupérer les statistiques locales
    let localStats = null;
    try {
      const localResponse = await fetch(`${req.nextUrl.origin}/api/radio/track`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (localResponse.ok) {
        const localData = await localResponse.json();
        localStats = localData.stats;
        console.log('📊 Stats locales récupérées:', localStats);
      }
    } catch (error) {
      console.log('⚠️ Impossible de récupérer les stats locales:', error);
    }
    // URLs alternatives pour récupérer les métadonnées radio (AzuraCast / fallback)
    const streamRadioUrls = stationCfg.metadataUrls;
    
    let data: any = null;
    let source: any = null;
    
    // Essayer plusieurs URLs
    for (const url of streamRadioUrls) {
      try {
        console.log(`🔍 Tentative de récupération depuis: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/html, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://rocket.streamradio.fr/'
          },
          signal: controller.signal,
          cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) continue;

        data = await response.json();
        console.log(`✅ Données JSON récupérées depuis: ${url}`);
        break;
      } catch (error: any) {
        console.log(`❌ Erreur avec ${url}:`, error.message);
        continue;
      }
    }
    
    // AzuraCast: /api/nowplaying/<station> ou /api/nowplaying (array)
    const azNowPlaying = (() => {
      if (!data) return null;
      // endpoint station => objet
      if (data?.now_playing?.song) return data;
      // endpoint global => array
      if (Array.isArray(data)) {
        const wanted = data.find((x: any) => String(x?.station?.shortcode || '').toLowerCase() === station);
        return wanted || null;
      }
      return null;
    })();

    if (azNowPlaying?.station && azNowPlaying?.now_playing?.song) {
      const st = azNowPlaying.station;
      const song = azNowPlaying.now_playing.song || {};
      const listeners = azNowPlaying.listeners || {};

      // bitrate: mount par défaut ou mount qui matche streamUrl
      const mounts = Array.isArray(st.mounts) ? st.mounts : [];
      const byUrl = mounts.find((m: any) => String(m?.url || '') === stationCfg.streamUrl);
      const byDefault = mounts.find((m: any) => m?.is_default);
      const mount = byUrl || byDefault || mounts[0] || null;

      const rawTitle = String(song?.title || '').trim();
      const rawArtist = String(song?.artist || '').trim();
      const rawText = String(song?.text || '').trim();

      // Normalisation title/artist (AzuraCast met parfois tout dans text)
      let parsedTitle = rawTitle || rawText;
      let parsedArtist = rawArtist;
      if (!parsedArtist && rawText) {
        const parts =
          rawText.includes(' - ') ? rawText.split(' - ') :
          rawText.includes(' — ') ? rawText.split(' — ') :
          rawText.includes(' – ') ? rawText.split(' – ') :
          null;
        if (parts && parts.length >= 2) {
          parsedArtist = parts[0].trim();
          parsedTitle = parts.slice(1).join(' - ').trim();
        }
      }
      if (!parsedTitle) parsedTitle = stationCfg.name;
      if (!parsedArtist) parsedArtist = stationCfg.name;

      const bitrate = parseInt(mount?.bitrate) || 0;
      const contentType = mount?.format ? `audio/${String(mount.format)}` : 'audio/mpeg';

      const radioData = {
        name: stationCfg.name,
        description: stationCfg.description,
        status: azNowPlaying.is_online ? 'LIVE' : 'OFFLINE',
        isOnline: !!azNowPlaying.is_online,
        currentTrack: {
          title: parsedTitle,
          artist: parsedArtist,
          genre: song?.genre || 'Electronic',
          album: song?.album || `${stationCfg.name} Collection`,
        },
        stats: {
          listeners: parseInt(listeners.current) || parseInt(listeners.total) || 0,
          bitrate: bitrate || 192,
          uptime: '24h/24',
          quality: (bitrate || 0) >= 192 ? 'HD' : 'Standard',
        },
        technical: {
          serverName: st.name || `${stationCfg.name} Server`,
          serverDescription: st.description || 'Radio en boucle continue',
          contentType,
          serverType: 'AzuraCast/Icecast',
          serverVersion: 'unknown',
        },
        lastUpdate: new Date().toISOString(),
        streamUrl: stationCfg.streamUrl,
      };

      return NextResponse.json(
        { success: true, data: radioData, source: 'azuracast', available: true },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        },
      );
    }

    // Fallback: Simulation réaliste basée sur l'heure et les patterns d'écoute
    {
      // Simulation réaliste basée sur l'heure et les patterns d'écoute
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay(); // 0 = dimanche, 6 = samedi
      
      // Patterns d'écoute réalistes selon l'heure
      let baseListeners = 0;
      if (hour >= 6 && hour < 9) {
        baseListeners = 1200; // Matinée
      } else if (hour >= 9 && hour < 12) {
        baseListeners = 800; // Matin
      } else if (hour >= 12 && hour < 14) {
        baseListeners = 1000; // Pause déjeuner
      } else if (hour >= 14 && hour < 18) {
        baseListeners = 600; // Après-midi
      } else if (hour >= 18 && hour < 22) {
        baseListeners = 1500; // Soirée (pic d'audience)
      } else if (hour >= 22 && hour < 24) {
        baseListeners = 1800; // Nuit (audience nocturne)
      } else {
        baseListeners = 400; // Nuit tardive
      }
      
      // Bonus weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baseListeners = Math.floor(baseListeners * 1.3);
      }
      
      // Utiliser les stats locales si disponibles, sinon simulation
      let finalListeners;
      if (localStats && localStats.currentListeners > 0) {
        // Combiner les stats locales avec la simulation pour plus de réalisme
        const localWeight = 0.7; // 70% des stats locales
        const simulationWeight = 0.3; // 30% de simulation
        
        const variation = Math.floor(baseListeners * 0.15 * (Math.random() - 0.5));
        const simulatedListeners = Math.max(50, baseListeners + variation);
        
        finalListeners = Math.floor(
          (localStats.currentListeners * localWeight) + 
          (simulatedListeners * simulationWeight)
        );
        
        console.log(`📊 Stats combinées - Locales: ${localStats.currentListeners}, Simulées: ${simulatedListeners}, Final: ${finalListeners}`);
      } else {
        // Variation aléatoire réaliste (±15%)
        const variation = Math.floor(baseListeners * 0.15 * (Math.random() - 0.5));
        finalListeners = Math.max(50, baseListeners + variation);
        console.log(`📊 Simulation pure - Auditeurs: ${finalListeners}`);
      }
      
      // Titres réalistes selon l'heure
      const tracks = {
        morning: [
          { title: 'Morning Vibes', artist: 'Sunrise DJ', genre: 'Chill House' },
          { title: 'Wake Up Call', artist: 'Dawn Beats', genre: 'Progressive' }
        ],
        afternoon: [
          { title: 'Afternoon Groove', artist: 'Daylight Mix', genre: 'Deep House' },
          { title: 'Urban Flow', artist: 'City Sounds', genre: 'Electronic' }
        ],
        evening: [
          { title: 'Night Drive', artist: 'Midnight Crew', genre: 'Dance' },
          { title: 'Club Anthem', artist: 'Party Masters', genre: 'House' }
        ],
        night: [
          { title: 'Deep Night', artist: 'Nocturnal DJ', genre: 'Deep House' },
          { title: 'Late Night Session', artist: 'Insomniac Beats', genre: 'Ambient' }
        ]
      };
      
      let trackCategory: keyof typeof tracks = 'evening';
      if (hour >= 6 && hour < 12) trackCategory = 'morning';
      else if (hour >= 12 && hour < 18) trackCategory = 'afternoon';
      else if (hour >= 18 && hour < 24) trackCategory = 'evening';
      else trackCategory = 'night';
      
      const randomTrack = tracks[trackCategory][Math.floor(Math.random() * tracks[trackCategory].length)];
      
      const defaultData = {
        name: stationCfg.name,
        description: stationCfg.description,
        status: 'LIVE',
        isOnline: true,
        
        currentTrack: {
          title: randomTrack.title,
          artist: randomTrack.artist,
          genre: randomTrack.genre,
          album: `${stationCfg.name} Collection`
        },
        
        stats: {
          listeners: finalListeners,
          bitrate: 192,
          uptime: '24h/24',
          quality: 'HD'
        },
        
        technical: {
          serverName: `${stationCfg.name} Server`,
          serverDescription: 'Radio en boucle continue',
          contentType: 'audio/mpeg',
          serverType: 'Icecast',
          serverVersion: '2.4.0'
        },
        
        lastUpdate: new Date().toISOString(),
        streamUrl: stationCfg.streamUrl
      };

      return NextResponse.json({
        success: true,
        data: defaultData,
        source: 'default',
        available: false,
        warning: 'Données par défaut utilisées'
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Erreur récupération données radio:', error.message);
    
    // Données de fallback en cas d'erreur
    const fallbackData = {
      name: stationCfg.name,
      description: stationCfg.description,
      status: 'LIVE',
      isOnline: true,
      
      currentTrack: {
        title: stationCfg.name,
        artist: 'En boucle continue',
        genre: 'Electronic',
        album: `${stationCfg.name} Collection`
      },
      
      stats: {
        listeners: Math.floor(Math.random() * 200) + 1000, // Simulation réaliste
        bitrate: 192,
        uptime: '24h/24',
        quality: 'HD'
      },
      
      technical: {
        serverName: `${stationCfg.name} Server`,
        serverDescription: 'Radio en boucle continue',
        contentType: 'audio/mpeg',
        serverType: 'Icecast',
        serverVersion: '2.4.0'
      },
      
      lastUpdate: new Date().toISOString(),
      streamUrl: stationCfg.streamUrl
    };

    return NextResponse.json({
      success: true,
      data: fallbackData,
      source: 'fallback',
      available: false,
      error: error.message
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
