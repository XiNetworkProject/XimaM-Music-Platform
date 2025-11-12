'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Cloud, 
  Search, 
  MapPin, 
  Star, 
  X, 
  Droplets, 
  Wind, 
  Sun, 
  Moon, 
  Umbrella, 
  Car, 
  Running, 
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Play,
  Music2,
  Radio,
  Calendar,
  Eye,
  TrendingUp,
  Image as ImageIcon,
  ExternalLink,
  Youtube,
  Instagram,
  Facebook,
  Globe,
  Gauge,
  Thermometer,
  Droplet,
  Zap,
  Snowflake,
  Waves
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '@/app/providers';
import toast from 'react-hot-toast';

interface Bulletin {
  id: string;
  title?: string;
  content?: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

interface WeatherData {
  current?: {
    temperature_2m: number;
    weather_code: number;
    time: string;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    wind_direction_10m: number[];
    uv_index: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    uv_index_max: number[];
  };
}

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

type TabType = 'now' | 'hourly' | 'daily' | 'radar' | 'alerts' | 'air';

const WEATHER_CODES: Record<number, { icon: string; label: string; emoji: string }> = {
  0: { icon: 'Sun', label: 'Ciel dégagé', emoji: '☀️' },
  1: { icon: 'Sun', label: 'Principalement dégagé', emoji: '🌤️' },
  2: { icon: 'Cloud', label: 'Partiellement nuageux', emoji: '⛅' },
  3: { icon: 'Cloud', label: 'Couvert', emoji: '☁️' },
  45: { icon: 'Cloud', label: 'Brouillard', emoji: '🌫️' },
  48: { icon: 'Cloud', label: 'Brouillard givrant', emoji: '🌫️' },
  51: { icon: 'Droplets', label: 'Bruine légère', emoji: '🌦️' },
  53: { icon: 'Droplets', label: 'Bruine modérée', emoji: '🌦️' },
  55: { icon: 'Droplets', label: 'Bruine dense', emoji: '🌦️' },
  61: { icon: 'Droplets', label: 'Pluie légère', emoji: '🌧️' },
  63: { icon: 'Droplets', label: 'Pluie modérée', emoji: '🌧️' },
  65: { icon: 'Droplets', label: 'Pluie forte', emoji: '🌧️' },
  71: { icon: 'Snowflake', label: 'Neige légère', emoji: '🌨️' },
  73: { icon: 'Snowflake', label: 'Neige modérée', emoji: '🌨️' },
  75: { icon: 'Snowflake', label: 'Neige forte', emoji: '🌨️' },
  77: { icon: 'Snowflake', label: 'Grains de neige', emoji: '❄️' },
  80: { icon: 'Droplets', label: 'Averses légères', emoji: '🌦️' },
  81: { icon: 'Droplets', label: 'Averses modérées', emoji: '🌦️' },
  82: { icon: 'Droplets', label: 'Averses violentes', emoji: '⛈️' },
  85: { icon: 'Snowflake', label: 'Averses de neige légères', emoji: '🌨️' },
  86: { icon: 'Snowflake', label: 'Averses de neige fortes', emoji: '🌨️' },
  95: { icon: 'Zap', label: 'Orage', emoji: '⛈️' },
  96: { icon: 'Zap', label: 'Orage avec grêle légère', emoji: '⛈️' },
  99: { icon: 'Zap', label: 'Orage avec grêle forte', emoji: '⛈️' },
};

function getWeatherInfo(code: number) {
  return WEATHER_CODES[code] || { icon: 'Cloud', label: 'Inconnu', emoji: '❓' };
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) return 'Aujourd\'hui';
  if (date.toDateString() === tomorrow.toDateString()) return 'Demain';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(degrees / 22.5) % 16];
}

export default function MeteoHubPage() {
  const { setQueueAndPlay, playTrack } = useAudioPlayer();
  
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('now');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [favorites, setFavorites] = useState<Location[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [airQuality, setAirQuality] = useState<any>(null);
  const [vigilance, setVigilance] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showSearch, setShowSearch] = useState(false);
  const [unitSpeed, setUnitSpeed] = useState<'kmh' | 'ms'>('kmh');

  // Charger les favoris depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('meteo_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Sauvegarder les favoris
  const saveFavorites = useCallback((favs: Location[]) => {
    localStorage.setItem('meteo_favorites', JSON.stringify(favs));
    setFavorites(favs);
  }, []);

  // Géolocalisation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const geoRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const city = geoData.city || geoData.principalSubdivision || 'Votre position';
              setCurrentLocation({ name: city, latitude, longitude, country: geoData.countryName, admin1: geoData.principalSubdivision });
              loadWeatherData(latitude, longitude);
            }
          } catch {}
        },
        () => {
          // Fallback: utiliser une ville par défaut (Paris)
          const defaultLoc: Location = { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France' };
          setCurrentLocation(defaultLoc);
          loadWeatherData(defaultLoc.latitude, defaultLoc.longitude);
        }
      );
    } else {
      const defaultLoc: Location = { name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France' };
      setCurrentLocation(defaultLoc);
      loadWeatherData(defaultLoc.latitude, defaultLoc.longitude);
    }
  }, []);

  // Charger les données météo
  const loadWeatherData = useCallback(async (lat: number, lon: number) => {
    try {
      const [forecastRes, airRes] = await Promise.all([
        fetch(`/api/meteo/forecast?lat=${lat}&lon=${lon}&days=10`),
        fetch(`/api/meteo/air-quality?lat=${lat}&lon=${lon}`)
      ]);

      if (forecastRes.ok) {
        const data = await forecastRes.json();
        setWeatherData(data);
        setLastUpdate(new Date());
      }

      if (airRes.ok) {
        const airData = await airRes.json();
        setAirQuality(airData);
      }
    } catch (error) {
      console.error('Erreur chargement météo:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger le bulletin Alertemps
  useEffect(() => {
    const fetchBulletin = async () => {
      try {
        const response = await fetch(`/api/meteo/public?_ts=${Date.now()}`, { cache: 'no-store' });
        const data = await response.json();
        if (response.ok && data.bulletin) {
          setBulletin(data.bulletin);
        }
      } catch (error) {
        console.error('Erreur chargement bulletin:', error);
      }
    };
    fetchBulletin();
  }, []);

  // Recherche de lieu
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/meteo/geocode?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  }, []);

  // Sélectionner un lieu
  const selectLocation = useCallback((loc: Location) => {
    setCurrentLocation(loc);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
    loadWeatherData(loc.latitude, loc.longitude);
  }, [loadWeatherData]);

  // Ajouter/retirer des favoris
  const toggleFavorite = useCallback((loc: Location) => {
    const isFav = favorites.some(f => f.name === loc.name && f.latitude === loc.latitude);
    if (isFav) {
      saveFavorites(favorites.filter(f => !(f.name === loc.name && f.latitude === loc.latitude)));
      toast.success('Retiré des favoris');
    } else {
      saveFavorites([...favorites, loc]);
      toast.success('Ajouté aux favoris');
    }
  }, [favorites, saveFavorites]);

  // Résumé 1 ligne
  const summaryLine = useMemo(() => {
    if (!weatherData?.current || !weatherData?.hourly) return '';
    const current = weatherData.current;
    const hourly = weatherData.hourly;
    const next30min = hourly.time.findIndex((t, i) => new Date(t) > new Date(Date.now() + 30 * 60000));
    const temp = Math.round(current.temperature_2m);
    const code = current.weather_code;
    const info = getWeatherInfo(code);
    const wind = hourly.wind_speed_10m?.[0] || 0;
    const windDir = hourly.wind_direction_10m?.[0] || 0;
    const precipProb = next30min >= 0 ? hourly.precipitation_probability[next30min] : 0;
    const precip = next30min >= 0 ? hourly.precipitation[next30min] : 0;
    
    let line = `${temp}° • ${info.label}`;
    if (precipProb > 30 || precip > 0.1) {
      line += ` • ${precipProb > 50 ? 'pluie' : 'pluie faible'} dans 30 min`;
    }
    line += ` • vent ${Math.round(unitSpeed === 'kmh' ? wind * 3.6 : wind)} ${unitSpeed === 'kmh' ? 'km/h' : 'm/s'} ${getWindDirection(windDir)}`;
    return line;
  }, [weatherData, unitSpeed]);

  // Thème dynamique selon la météo
  const themeGradient = useMemo(() => {
    if (!weatherData?.current) return 'from-blue-900/20 via-purple-900/20 to-pink-900/20';
    const code = weatherData.current.weather_code;
    if (code === 0 || code === 1) return 'from-yellow-900/20 via-orange-900/20 to-pink-900/20';
    if (code >= 51 && code <= 82) return 'from-blue-900/30 via-cyan-900/30 to-indigo-900/30';
    if (code >= 95) return 'from-purple-900/30 via-indigo-900/30 to-blue-900/30';
    return 'from-gray-900/20 via-slate-900/20 to-zinc-900/20';
  }, [weatherData]);

  // Playlist météo
  const playWeatherPlaylist = useCallback(async (mood: 'rain' | 'sun' | 'wind' | 'night') => {
    try {
      const genreMap: Record<string, string> = {
        rain: 'chill',
        sun: 'dance',
        wind: 'ambient',
        night: 'jazz'
      };
      
      const genre = genreMap[mood] || 'chill';
      const res = await fetch(`/api/tracks?category=${genre}&limit=20&sort=trending`);
      if (res.ok) {
        const data = await res.json();
        if (data.tracks?.length > 0) {
          setQueueAndPlay(data.tracks, 0);
          toast.success(`Playlist ${mood === 'rain' ? 'Pluie' : mood === 'sun' ? 'Soleil' : mood === 'wind' ? 'Vent' : 'Nuit'} lancée`);
        } else {
          toast.error('Aucune musique trouvée pour cette ambiance');
        }
      }
    } catch (error) {
      toast.error('Erreur chargement playlist');
    }
  }, [setQueueAndPlay]);

  // Moments utiles
  const usefulMoments = useMemo(() => {
    if (!weatherData?.hourly) return null;
    const hourly = weatherData.hourly;
    const now = new Date();
    const next24h = hourly.time.slice(0, 24).map((t, i) => ({
      time: new Date(t),
      precip: hourly.precipitation[i] || 0,
      precipProb: hourly.precipitation_probability[i] || 0,
      wind: hourly.wind_speed_10m[i] || 0,
      uv: hourly.uv_index[i] || 0,
      code: hourly.weather_code[i] || 0
    }));

    // Parapluie
    const dryPeriods = [];
    let dryStart: Date | null = null;
    for (const h of next24h) {
      if (h.precipProb < 30 && h.precip < 0.1) {
        if (!dryStart) dryStart = h.time;
      } else {
        if (dryStart) {
          dryPeriods.push({ start: dryStart, end: h.time });
          dryStart = null;
        }
      }
    }
    if (dryStart) dryPeriods.push({ start: dryStart, end: next24h[next24h.length - 1].time });

    // Courir
    const runWindows = next24h.filter(h => h.precipProb < 20 && h.wind * 3.6 < 30 && h.time > now);

    // Soleil/UV
    const maxUV = Math.max(...next24h.map(h => h.uv));
    const maxUVTime = next24h.find(h => h.uv === maxUV)?.time;

    // Laver voiture
    const noRain24h = next24h.every(h => h.precipProb < 20 && h.precip < 0.1);

    return {
      umbrella: dryPeriods.length > 0 ? { needed: false, dryPeriods } : { needed: true, dryPeriods: [] },
      running: runWindows.length > 0 ? { possible: true, windows: runWindows.slice(0, 3) } : { possible: false, windows: [] },
      sun: maxUVTime ? { maxUV, maxUVTime, spf: maxUV > 6 ? 'SPF 50+' : maxUV > 3 ? 'SPF 30+' : 'SPF 15+' } : null,
      carWash: { safe: noRain24h }
    };
  }, [weatherData]);

  if (loading && !currentLocation) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[var(--background)] pb-24 lg:pb-8 bg-gradient-to-br ${themeGradient}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pt-8">
        {/* En-tête smart */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6">
            {/* Barre de recherche et géoloc */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Rechercher une ville..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <AnimatePresence>
                  {showSearch && (searchResults.length > 0 || searchQuery) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-white/10 rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto"
                    >
                      {searchResults.map((loc, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectLocation(loc)}
                          className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-center justify-between group"
                        >
                          <div>
                            <div className="font-medium text-white">{loc.name}</div>
                            {loc.admin1 && <div className="text-sm text-white/60">{loc.admin1}, {loc.country}</div>}
                          </div>
                          <MapPin className="w-4 h-4 text-white/40 group-hover:text-white/60" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => {
                  if (currentLocation) toggleFavorite(currentLocation);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2"
              >
                <Star className={`w-5 h-5 ${favorites.some(f => f.name === currentLocation?.name) ? 'fill-yellow-400 text-yellow-400' : 'text-white/50'}`} />
                <span className="hidden sm:inline text-white">Favoris</span>
              </button>
              <button
                onClick={() => {
                  if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        const { latitude, longitude } = pos.coords;
                        const geoRes = await fetch(
                          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`
                        );
                        if (geoRes.ok) {
                          const geoData = await geoRes.json();
                          const loc: Location = {
                            name: geoData.city || 'Votre position',
                            latitude,
                            longitude,
                            country: geoData.countryName,
                            admin1: geoData.principalSubdivision
                          };
                          selectLocation(loc);
                        }
                      }
                    );
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition flex items-center gap-2"
              >
                <MapPin className="w-5 h-5 text-blue-400" />
                <span className="hidden sm:inline text-white">Ma position</span>
              </button>
            </div>

            {/* Favoris rapides */}
            {favorites.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {favorites.map((fav, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectLocation(fav)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm text-white/80 flex items-center gap-2"
                  >
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    {fav.name}
                  </button>
                ))}
              </div>
            )}

            {/* Résumé 1 ligne */}
            {summaryLine && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {currentLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-white">{currentLocation.name}</span>
                    </div>
                  )}
                  <span className="text-white/80 text-sm">{summaryLine}</span>
                </div>
                <div className="text-xs text-white/50">
                  Dernière maj {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {(['now', 'hourly', 'daily', 'radar', 'alerts', 'air'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-medium transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-500/20 border border-blue-500/30 text-white'
                  : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              {tab === 'now' && 'Maintenant'}
              {tab === 'hourly' && 'Heure par heure'}
              {tab === 'daily' && '7-10 jours'}
              {tab === 'radar' && 'Radar'}
              {tab === 'alerts' && 'Alertes'}
              {tab === 'air' && 'Air/Pollen'}
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        <AnimatePresence mode="wait">
          {activeTab === 'now' && (
            <motion.div
              key="now"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <NowTab weatherData={weatherData} unitSpeed={unitSpeed} setUnitSpeed={setUnitSpeed} usefulMoments={usefulMoments} playWeatherPlaylist={playWeatherPlaylist} />
            </motion.div>
          )}
          {activeTab === 'hourly' && (
            <motion.div
              key="hourly"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HourlyTab weatherData={weatherData} unitSpeed={unitSpeed} />
            </motion.div>
          )}
          {activeTab === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DailyTab weatherData={weatherData} />
            </motion.div>
          )}
          {activeTab === 'radar' && (
            <motion.div
              key="radar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <RadarTab currentLocation={currentLocation} />
            </motion.div>
          )}
          {activeTab === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AlertsTab bulletin={bulletin} />
            </motion.div>
          )}
          {activeTab === 'air' && (
            <motion.div
              key="air"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AirTab airQuality={airQuality} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Composant Onglet Maintenant
function NowTab({ weatherData, unitSpeed, setUnitSpeed, usefulMoments, playWeatherPlaylist }: any) {
  if (!weatherData?.current) {
    return <div className="text-center text-white/60 py-12">Chargement...</div>;
  }

  const current = weatherData.current;
  const info = getWeatherInfo(current.weather_code);
  const hourly = weatherData.hourly;

  return (
    <div className="space-y-4">
      {/* Carte principale */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-6xl font-bold text-white mb-2">{Math.round(current.temperature_2m)}°</div>
            <div className="text-2xl text-white/80">{info.label}</div>
          </div>
          <div className="text-6xl">{info.emoji}</div>
        </div>

        {hourly && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs text-white/60">Humidité</div>
                <div className="text-white font-medium">{hourly.relative_humidity_2m?.[0] || '—'}%</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-xs text-white/60">Vent</div>
                <div className="text-white font-medium">
                  {Math.round(unitSpeed === 'kmh' ? (hourly.wind_speed_10m[0] || 0) * 3.6 : hourly.wind_speed_10m[0] || 0)} {unitSpeed === 'kmh' ? 'km/h' : 'm/s'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-xs text-white/60">UV</div>
                <div className="text-white font-medium">{hourly.uv_index?.[0] || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-xs text-white/60">Pression</div>
                <div className="text-white font-medium">—</div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setUnitSpeed(unitSpeed === 'kmh' ? 'ms' : 'kmh')}
          className="mt-4 text-xs text-white/60 hover:text-white/80"
        >
          Unités: {unitSpeed === 'kmh' ? 'km/h' : 'm/s'} ↔ {unitSpeed === 'kmh' ? 'm/s' : 'km/h'}
        </button>
      </div>

      {/* Moments utiles */}
      {usefulMoments && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Umbrella className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-white">Parapluie</span>
            </div>
            {usefulMoments.umbrella.needed ? (
              <div className="text-white/80 text-sm">Pluie prévue aujourd'hui, prenez votre parapluie</div>
            ) : usefulMoments.umbrella.dryPeriods.length > 0 ? (
              <div className="text-white/80 text-sm">
                Périodes sèches: {usefulMoments.umbrella.dryPeriods.slice(0, 2).map((p: any) => 
                  `${formatTime(p.start.toISOString())}-${formatTime(p.end.toISOString())}`
                ).join(', ')}
              </div>
            ) : (
              <div className="text-green-400 text-sm">Pas de pluie prévue</div>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Running className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-white">Courir</span>
            </div>
            {usefulMoments.running.possible ? (
              <div className="text-white/80 text-sm">
                Fenêtres favorables: {usefulMoments.running.windows.map((w: any) => formatTime(w.time.toISOString())).join(', ')}
              </div>
            ) : (
              <div className="text-white/60 text-sm">Conditions difficiles aujourd'hui</div>
            )}
          </div>

          {usefulMoments.sun && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold text-white">Soleil/UV</span>
              </div>
              <div className="text-white/80 text-sm">
                UV max: {usefulMoments.sun.maxUV} à {formatTime(usefulMoments.sun.maxUVTime.toISOString())}
                <br />
                <span className="text-yellow-400">Protection: {usefulMoments.sun.spf}</span>
              </div>
            </div>
          )}

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white">Laver voiture</span>
            </div>
            {usefulMoments.carWash.safe ? (
              <div className="text-green-400 text-sm">Pas de pluie prévue dans les 24h, vous pouvez laver</div>
            ) : (
              <div className="text-white/60 text-sm">Pluie prévue, attendez</div>
            )}
          </div>
        </div>
      )}

      {/* Playlists météo Synaura */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Music2 className="w-5 h-5 text-purple-400" />
          <span className="font-semibold text-white">Playlists météo Synaura</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => playWeatherPlaylist('rain')}
            className="px-4 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition flex items-center gap-2"
          >
            <Droplets className="w-4 h-4" />
            <span className="text-sm text-white">Pluie</span>
          </button>
          <button
            onClick={() => playWeatherPlaylist('sun')}
            className="px-4 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 transition flex items-center gap-2"
          >
            <Sun className="w-4 h-4" />
            <span className="text-sm text-white">Soleil</span>
          </button>
          <button
            onClick={() => playWeatherPlaylist('wind')}
            className="px-4 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 transition flex items-center gap-2"
          >
            <Wind className="w-4 h-4" />
            <span className="text-sm text-white">Vent</span>
          </button>
          <button
            onClick={() => playWeatherPlaylist('night')}
            className="px-4 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 transition flex items-center gap-2"
          >
            <Moon className="w-4 h-4" />
            <span className="text-sm text-white">Nuit</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant Onglet Heure par heure
function HourlyTab({ weatherData, unitSpeed }: any) {
  if (!weatherData?.hourly) {
    return <div className="text-center text-white/60 py-12">Chargement...</div>;
  }

  const hourly = weatherData.hourly;
  const next48h = hourly.time.slice(0, 48).map((t: string, i: number) => ({
    time: new Date(t),
    temp: hourly.temperature_2m[i],
    precipProb: hourly.precipitation_probability[i],
    precip: hourly.precipitation[i],
    wind: hourly.wind_speed_10m[i],
    gusts: hourly.wind_gusts_10m[i],
    windDir: hourly.wind_direction_10m[i],
    uv: hourly.uv_index[i],
    code: hourly.weather_code[i]
  }));

  const maxTemp = Math.max(...next48h.map((h: any) => h.temp));
  const minTemp = Math.min(...next48h.map((h: any) => h.temp));
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-white mb-6">Prévisions 48h</h3>
      <div className="space-y-8">
        {/* Graphique température */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/80">Température</span>
            <span className="text-xs text-white/60">{Math.round(minTemp)}° - {Math.round(maxTemp)}°</span>
          </div>
          <div className="relative h-32">
            <svg className="w-full h-full" viewBox={`0 0 ${next48h.length * 20} 120`} preserveAspectRatio="none">
              <polyline
                points={next48h.map((h: any, i: number) => 
                  `${i * 20},${100 - ((h.temp - minTemp) / tempRange) * 80}`
                ).join(' ')}
                fill="none"
                stroke="url(#tempGradient)"
                strokeWidth="2"
              />
              <defs>
                <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Liste horaire */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {next48h.map((h: any, idx: number) => {
            const info = getWeatherInfo(h.code);
            return (
              <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
                <div className="w-16 text-sm text-white/80">{formatTime(h.time.toISOString())}</div>
                <div className="text-2xl">{info.emoji}</div>
                <div className="flex-1">
                  <div className="text-white font-medium">{Math.round(h.temp)}°</div>
                  <div className="text-xs text-white/60">{info.label}</div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {h.precipProb > 0 && (
                    <div className="flex items-center gap-1">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <span className="text-white/80">{h.precipProb}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Wind className="w-4 h-4 text-cyan-400" />
                    <span className="text-white/80">
                      {Math.round(unitSpeed === 'kmh' ? h.wind * 3.6 : h.wind)} {unitSpeed === 'kmh' ? 'km/h' : 'm/s'}
                    </span>
                  </div>
                  {h.uv > 0 && idx % 4 === 0 && (
                    <div className="flex items-center gap-1">
                      <Sun className="w-4 h-4 text-yellow-400" />
                      <span className="text-white/80">{h.uv}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Composant Onglet 7-10 jours
function DailyTab({ weatherData }: any) {
  if (!weatherData?.daily) {
    return <div className="text-center text-white/60 py-12">Chargement...</div>;
  }

  const daily = weatherData.daily;
  const days = daily.time.map((t: string, i: number) => ({
    date: new Date(t),
    max: daily.temperature_2m_max[i],
    min: daily.temperature_2m_min[i],
    precip: daily.precipitation_sum[i],
    precipProb: daily.precipitation_probability_max[i],
    code: daily.weather_code[i],
    wind: daily.wind_speed_10m_max[i],
    uv: daily.uv_index_max[i]
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {days.map((day: any, idx: number) => {
        const info = getWeatherInfo(day.code);
        return (
          <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-white">{formatDate(day.date.toISOString())}</div>
                <div className="text-sm text-white/60">{day.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
              </div>
              <div className="text-3xl">{info.emoji}</div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold text-white">{Math.round(day.max)}°</span>
              <span className="text-lg text-white/60">/{Math.round(day.min)}°</span>
            </div>
            <div className="space-y-2 text-sm">
              {day.precipProb > 0 && (
                <div className="flex items-center gap-2 text-white/80">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <span>{day.precipProb}% • {day.precip.toFixed(1)}mm</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-white/80">
                <Wind className="w-4 h-4 text-cyan-400" />
                <span>{Math.round(day.wind * 3.6)} km/h</span>
              </div>
              {day.uv > 0 && (
                <div className="flex items-center gap-2 text-white/80">
                  <Sun className="w-4 h-4 text-yellow-400" />
                  <span>UV {day.uv}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Composant Onglet Radar
function RadarTab({ currentLocation }: any) {
  if (!currentLocation) {
    return <div className="text-center text-white/60 py-12">Position requise</div>;
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-white mb-4">Radar pluie</h3>
      <div className="aspect-video rounded-xl overflow-hidden bg-black/20">
        <iframe
          src={`https://www.rainviewer.com/map.html?loc=${currentLocation.latitude},${currentLocation.longitude},8&oFa=0&oC=0&oU=0&oCS=1&oF=0&oAP=0&c=1&o=83&lm=0&th=0&sm=1&sn=1`}
          className="w-full h-full border-0"
          title="Radar pluie"
        />
      </div>
      <p className="mt-4 text-sm text-white/60">
        Données fournies par <a href="https://www.rainviewer.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Rainviewer</a>
      </p>
    </div>
  );
}

// Composant Onglet Alertes
function AlertsTab({ bulletin }: any) {
  return (
    <div className="space-y-4">
      {bulletin && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="relative w-full aspect-video bg-[var(--surface-2)]">
            <img 
              src={bulletin.image_url}
              alt="Carte météo Alertemps"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 left-4">
              <div className="px-3 py-1.5 bg-blue-500/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5" />
                Alertemps
              </div>
            </div>
          </div>
          {bulletin.title && (
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-2">{bulletin.title}</h3>
              {bulletin.content && (
                <p className="text-white/80 whitespace-pre-wrap">{bulletin.content}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <h3 className="text-xl font-semibold text-white">Vigilance Météo-France</h3>
        </div>
        <p className="text-white/60 text-sm mb-4">
          Consultez les alertes officielles sur{' '}
          <a href="https://vigilance.meteofrance.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            vigilance.meteofrance.com
          </a>
        </p>
        <div className="grid grid-cols-4 gap-2">
          {['vert', 'jaune', 'orange', 'rouge'].map((color) => (
            <div key={color} className={`h-12 rounded-lg border-2 ${
              color === 'vert' ? 'bg-green-500/20 border-green-500' :
              color === 'jaune' ? 'bg-yellow-500/20 border-yellow-500' :
              color === 'orange' ? 'bg-orange-500/20 border-orange-500' :
              'bg-red-500/20 border-red-500'
            }`} />
          ))}
        </div>
      </div>

      {/* Liens partenaires */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="https://www.youtube.com/@CIEUXINSTABLES"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-700 text-white transition-colors font-medium"
        >
          <span className="inline-flex items-center gap-2"><Youtube className="w-4 h-4" /> Cieux Instables</span>
          <ExternalLink className="w-4 h-4 opacity-90" />
        </a>
        <a
          href="https://www.youtube.com/@alertemps"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-700 text-white transition-colors font-medium"
        >
          <span className="inline-flex items-center gap-2"><Youtube className="w-4 h-4" /> Alertemps</span>
          <ExternalLink className="w-4 h-4 opacity-90" />
        </a>
      </div>
    </div>
  );
}

// Composant Onglet Air/Pollen
function AirTab({ airQuality }: any) {
  if (!airQuality) {
    return <div className="text-center text-white/60 py-12">Chargement qualité de l'air...</div>;
  }

  const getAQILevel = (pm25: number) => {
    if (pm25 <= 10) return { level: 'Bon', color: 'green', advice: 'Air excellent, profitez-en' };
    if (pm25 <= 20) return { level: 'Moyen', color: 'yellow', advice: 'Air acceptable' };
    if (pm25 <= 25) return { level: 'Dégradé', color: 'orange', advice: 'Sensible, évitez les efforts' };
    return { level: 'Mauvais', color: 'red', advice: 'Évitez les activités extérieures' };
  };

  const currentPM25 = airQuality.hourly?.pm2_5?.[0] || 0;
  const aqi = getAQILevel(currentPM25);

  return (
    <div className="space-y-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Qualité de l'air</h3>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-bold text-white mb-1">PM2.5: {currentPM25.toFixed(1)}</div>
            <div className={`text-lg font-medium text-${aqi.color}-400`}>{aqi.level}</div>
          </div>
          <div className={`w-16 h-16 rounded-full border-4 border-${aqi.color}-400 flex items-center justify-center`}>
            <span className="text-2xl">{aqi.level === 'Bon' ? '✓' : aqi.level === 'Moyen' ? '○' : '!'}</span>
          </div>
        </div>
        <p className="text-white/80 text-sm">{aqi.advice}</p>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Pollen</h3>
        <p className="text-white/60 text-sm mb-4">
          Consultez les données polliniques sur{' '}
          <a href="https://www.pollens.fr" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            pollens.fr
          </a>
          {' '}ou via l'API Atmo France.
        </p>
        <div className="text-xs text-white/50">
          Note: Les données polliniques détaillées nécessitent une intégration avec l'API Atmo Pollen (remplaçant du RNSA depuis 2025).
        </div>
      </div>
    </div>
  );
}
