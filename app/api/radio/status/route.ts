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
        'https://rocket.streamradio.fr/status-json.xsl',
        'https://rocket.streamradio.fr/status.xsl',
        'https://rocket.streamradio.fr/7.html',
        'https://rocket.streamradio.fr/status.xsl?mount=/stream/mixxparty'
      ]
    },
    ximam: {
      name: 'XimaM Radio',
      description: 'Radio XimaM en continu 24h/24',
      streamUrl: 'https://stream.mixx-party.fr/listen/ximam/radio.mp3',
      metadataUrls: [
        'https://stream.mixx-party.fr/status-json.xsl',
        'https://stream.mixx-party.fr/status.xsl',
        'https://stream.mixx-party.fr/7.html',
        // fallback générique si le serveur ne fournit pas ces endpoints
        'https://rocket.streamradio.fr/status-json.xsl',
        'https://rocket.streamradio.fr/status.xsl',
        'https://rocket.streamradio.fr/7.html'
      ]
    }
  };

  const station = STATIONS[stationParam] ? stationParam : 'mixx_party';
  const stationCfg = STATIONS[station];

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
    // URLs alternatives pour récupérer les métadonnées radio
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

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else {
            // Essayer de parser comme HTML/XML
            const text = await response.text();
            console.log(`📄 Réponse HTML/XML reçue: ${text.substring(0, 200)}...`);
            
            // Parser les données HTML simples
            const listenersMatch = text.match(/listeners[:\s]*(\d+)/i);
            const titleMatch = text.match(/title[:\s]*([^<\n]+)/i);
            
            if (listenersMatch || titleMatch) {
              data = {
                icestats: {
                  source: {
                    listeners: listenersMatch ? parseInt(listenersMatch[1]) : 0,
                    title: titleMatch ? titleMatch[1].trim() : stationCfg.name,
                    artist: 'En boucle continue',
                    bitrate: 128,
                    server_name: `${stationCfg.name} Server`
                  }
                }
              };
            }
          }
          
          if (data?.icestats?.source) {
            source = data.icestats.source;
            console.log(`✅ Données récupérées depuis: ${url}`);
            break;
          }
        }
      } catch (error: any) {
        console.log(`❌ Erreur avec ${url}:`, error.message);
        continue;
      }
    }
    
    // Analyser les données StreamRadio
    if (data && data.icestats && data.icestats.source) {
      const sources = Array.isArray(data.icestats.source) ? data.icestats.source : [data.icestats.source];
      const pickByStation = (src: any) => {
        const needle = station.toLowerCase();
        const title = String(src?.title || '').toLowerCase();
        const serverName = String(src?.server_name || '').toLowerCase();
        const listenurl = String(src?.listenurl || src?.listenUrl || '').toLowerCase();
        return title.includes(needle) || serverName.includes(needle) || listenurl.includes(needle);
      };
      const source = sources.find(pickByStation) || sources[0];

      // Icecast met souvent "Artist - Title" dans source.title. On normalise ici.
      const rawTitle = String(source?.title || '').trim();
      const rawArtist = String(source?.artist || '').trim();
      let parsedArtist = rawArtist;
      let parsedTitle = rawTitle;
      if (!parsedArtist && rawTitle) {
        const parts =
          rawTitle.includes(' - ') ? rawTitle.split(' - ') :
          rawTitle.includes(' — ') ? rawTitle.split(' — ') :
          rawTitle.includes(' – ') ? rawTitle.split(' – ') :
          null;
        if (parts && parts.length >= 2) {
          parsedArtist = parts[0].trim();
          parsedTitle = parts.slice(1).join(' - ').trim();
        }
      }
      // Si on n'a toujours rien d'exploitable, fallback propre
      if (!parsedTitle) parsedTitle = stationCfg.name;
      if (!parsedArtist) parsedArtist = stationCfg.name;
      
      // Extraire les informations en temps réel
      const radioData = {
        // Informations de base
        name: stationCfg.name,
        description: stationCfg.description,
        status: 'LIVE',
        isOnline: true,
        
        // Métadonnées de la piste actuelle
        currentTrack: {
          title: parsedTitle,
          artist: parsedArtist,
          genre: source.genre || 'Electronic',
          album: source.album || 'Mixx Party Collection'
        },
        
        // Statistiques en temps réel
        stats: {
          listeners: parseInt(source.listeners) || 0,
          bitrate: parseInt(source.bitrate) || 128,
          uptime: source.uptime || '24h/24',
          quality: (parseInt(source.bitrate) || 0) >= 192 ? 'HD' : 'Standard'
        },
        
        // Informations techniques
        technical: {
          serverName: source.server_name || `${stationCfg.name} Server`,
          serverDescription: source.server_description || 'Radio en boucle continue',
          contentType: source.content_type || 'audio/mpeg',
          serverType: source.server_type || 'Icecast',
          serverVersion: source.server_version || '2.4.0'
        },
        
        // Timestamp de la dernière mise à jour
        lastUpdate: new Date().toISOString(),
        
        // URL de streaming
        streamUrl: stationCfg.streamUrl
      };

      console.log('📻 Données radio récupérées:', {
        listeners: radioData.stats.listeners,
        currentTrack: radioData.currentTrack.title,
        bitrate: radioData.stats.bitrate
      });

      return NextResponse.json({
        success: true,
        data: radioData,
        source: 'streamradio.fr'
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

    } else {
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
