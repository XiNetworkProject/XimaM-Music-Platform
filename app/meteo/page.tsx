'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { notify } from '@/components/NotificationCenter';
import { useSession } from 'next-auth/react';

import {
  Sun, Moon, CloudSun, CloudFog, CloudRain, Snowflake, CloudLightning, Cloud,
  MapPin, LocateFixed, Search, Wind, Droplets, Thermometer,
  Heart, ThumbsUp, Share2, MessageCircle, Send, ChevronRight,
  AlertTriangle, X, Eye, Calendar, Clock, Loader2, Zap,
  Sunrise, Sunset, Activity, ExternalLink, ChevronLeft,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────
interface Alert {
  id: string;
  title: string;
  content?: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  regions: string[];
  is_active: boolean;
}

interface Bulletin {
  id: string;
  title?: string;
  content?: string;
  image_url?: string;
  category?: string;
  tags?: string[];
  allow_comments?: boolean;
  views_count?: number;
  share_count?: number;
  created_at: string;
  updated_at: string;
}

interface BulletinSummary {
  id: string;
  title?: string;
  image_url?: string;
  category?: string;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  reply_count: number;
  profiles?: { name?: string; avatar?: string };
}

interface GeoResult {
  id: number;
  name: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
}

// ─── Constants ───────────────────────────────────────────────────────
const DEFAULT_LAT = 48.8566;
const DEFAULT_LON = 2.3522;
const DEFAULT_CITY = 'Paris';

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-blue-500/15 border-blue-500/20 text-blue-200',
  warning: 'bg-amber-500/15 border-amber-500/20 text-amber-200',
  danger: 'bg-orange-500/15 border-orange-500/20 text-orange-200',
  critical: 'bg-red-500/15 border-red-500/20 text-red-200',
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  prevision: { bg: 'bg-emerald-500/10 border-emerald-500/15', text: 'text-emerald-300', label: 'Prévision' },
  vigilance: { bg: 'bg-amber-500/10 border-amber-500/15', text: 'text-amber-300', label: 'Vigilance' },
  info: { bg: 'bg-blue-500/10 border-blue-500/15', text: 'text-blue-300', label: 'Info' },
  special: { bg: 'bg-red-500/10 border-red-500/15', text: 'text-red-300', label: 'Spécial' },
};

// ─── Helpers ─────────────────────────────────────────────────────────
function getWeatherIcon(code: number) {
  if (code === 0) return { Icon: Sun, color: 'text-yellow-400', label: 'Ciel dégagé' };
  if (code <= 3) return { Icon: CloudSun, color: 'text-gray-300', label: 'Partiellement nuageux' };
  if (code <= 48) return { Icon: CloudFog, color: 'text-gray-400', label: 'Brouillard' };
  if (code <= 67) return { Icon: CloudRain, color: 'text-blue-400', label: 'Pluie' };
  if (code <= 77) return { Icon: Snowflake, color: 'text-cyan-300', label: 'Neige' };
  if (code <= 82) return { Icon: CloudRain, color: 'text-blue-500', label: 'Averses' };
  if (code <= 86) return { Icon: Snowflake, color: 'text-cyan-200', label: 'Averses de neige' };
  return { Icon: CloudLightning, color: 'text-yellow-500', label: 'Orage' };
}

function getMoonPhase(date: Date) {
  const refNewMoon = new Date(2000, 0, 6, 18, 14).getTime();
  const SYNODIC = 29.53059;
  const daysSince = (date.getTime() - refNewMoon) / 86400000;
  const phase = ((daysSince % SYNODIC) + SYNODIC) % SYNODIC;
  const illumination = Math.round((1 - Math.cos((2 * Math.PI * phase) / SYNODIC)) / 2 * 100);

  let name: string;
  if (phase < 1.85) name = 'Nouvelle lune';
  else if (phase < 7.38) name = 'Premier croissant';
  else if (phase < 9.23) name = 'Premier quartier';
  else if (phase < 14.77) name = 'Gibbeuse croissante';
  else if (phase < 16.61) name = 'Pleine lune';
  else if (phase < 22.15) name = 'Gibbeuse décroissante';
  else if (phase < 23.99) name = 'Dernier quartier';
  else if (phase < 27.68) name = 'Dernier croissant';
  else name = 'Nouvelle lune';

  const daysToFull = phase < 14.77 ? 14.77 - phase : SYNODIC - phase + 14.77;
  const nextFull = new Date(date.getTime() + daysToFull * 86400000);

  return { illumination, name, nextFull };
}

function frenchDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Il y a ${days}j`;
}

function computeRisks(hourly: any) {
  if (!hourly?.weathercode?.length) return null;
  const codes: number[] = hourly.weathercode.slice(0, 24);
  const temps: number[] = (hourly.temperature_2m || []).slice(0, 24);
  const winds: number[] = (hourly.wind_gusts_10m || []).slice(0, 24);
  const precip: number[] = (hourly.precipitation || []).slice(0, 24);

  const maxWind = Math.max(...winds, 0);
  const maxTemp = Math.max(...temps, 0);
  const minTemp = Math.min(...temps, 20);
  const totalPrecip = precip.reduce((a, b) => a + b, 0);
  const hasThunder = codes.some(c => c >= 95);
  const hasSnow = codes.some(c => (c >= 71 && c <= 77) || (c >= 85 && c <= 86));
  const hasRain = codes.some(c => (c >= 51 && c <= 67) || (c >= 80 && c <= 82));

  const clamp = (v: number) => Math.min(5, Math.max(0, Math.round(v)));

  return [
    { label: 'Orages', level: clamp(hasThunder ? 4 : codes.some(c => c >= 80) ? 2 : 0), color: 'bg-yellow-500' },
    { label: 'Pluie', level: clamp(hasRain ? Math.min(5, totalPrecip / 5) : 0), color: 'bg-blue-500' },
    { label: 'Vent', level: clamp(maxWind > 100 ? 5 : maxWind > 60 ? 3 : maxWind > 40 ? 2 : maxWind > 25 ? 1 : 0), color: 'bg-teal-500' },
    { label: 'Neige', level: clamp(hasSnow ? 3 : minTemp < 0 && hasRain ? 1 : 0), color: 'bg-cyan-400' },
    { label: 'Verglas', level: clamp(minTemp <= 0 && minTemp > -3 && totalPrecip > 0 ? 3 : minTemp <= 0 ? 1 : 0), color: 'bg-indigo-400' },
    { label: 'Canicule', level: clamp(maxTemp > 40 ? 5 : maxTemp > 35 ? 3 : maxTemp > 30 ? 1 : 0), color: 'bg-red-500' },
  ];
}

// ─── Component ───────────────────────────────────────────────────────
export default function MeteoPage() {
  const { data: session } = useSession();

  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [cityName, setCityName] = useState(DEFAULT_CITY);
  const [query, setQuery] = useState('');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [recentBulletins, setRecentBulletins] = useState<BulletinSummary[]>([]);
  const [loadingBulletin, setLoadingBulletin] = useState(true);

  const [forecast, setForecast] = useState<any>(null);
  const [airQuality, setAirQuality] = useState<any>(null);
  const [sunData, setSunData] = useState<{ sunrise: string; sunset: string } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const [reactions, setReactions] = useState<{ likes: number; useful: number; userReactions: string[] }>({ likes: 0, useful: 0, userReactions: [] });
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const historyRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(), []);
  const moon = useMemo(() => getMoonPhase(now), [now]);

  // ── Alerts ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/meteo/alerts/active');
        const data = await res.json();
        if (data.alerts) setAlerts(data.alerts);
      } catch {}
    })();
  }, []);

  // ── Bulletin + History ──
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingBulletin(true);
      try {
        const res = await fetch(`/api/meteo/public?source=meteo_page&history=true&_ts=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        if (data.bulletin) setBulletin(data.bulletin);
        if (data.recentBulletins) setRecentBulletins(data.recentBulletins);
      } catch {}
      finally { if (alive) setLoadingBulletin(false); }
    })();
    return () => { alive = false; };
  }, []);

  // ── Reactions ──
  useEffect(() => {
    if (!bulletin?.id) return;
    (async () => {
      try {
        const res = await fetch(`/api/meteo/reactions?bulletinId=${bulletin.id}`);
        const data = await res.json();
        setReactions({ likes: data.likes || 0, useful: data.useful || 0, userReactions: data.userReactions || [] });
      } catch {}
    })();
  }, [bulletin?.id]);

  // ── Comments ──
  const fetchComments = useCallback(async () => {
    if (!bulletin?.id) return;
    try {
      const res = await fetch(`/api/meteo/comments?bulletinId=${bulletin.id}`);
      const data = await res.json();
      setComments(data.comments || []);
      setCommentCount(data.total || 0);
    } catch {}
  }, [bulletin?.id]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // ── Geocoding ──
  useEffect(() => {
    if (!query.trim()) { setGeoResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=fr`);
        const data = await res.json();
        setGeoResults((data.results || []).map((r: any) => ({
          id: r.id, name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''} (${r.country_code})`,
          country: r.country, country_code: r.country_code, latitude: r.latitude, longitude: r.longitude,
        })));
      } catch {}
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Weather Data ──
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingWeather(true);
      try {
        const [fRes, aRes, sRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=Europe/Paris&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,weathercode,relative_humidity_2m,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,sunrise,sunset&forecast_days=6`),
          fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&timezone=Europe/Paris&hourly=pm2_5,pm10,uv_index`),
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=Europe/Paris&forecast_days=1`),
        ]);
        const [fData, aData, sData] = await Promise.all([fRes.json(), aRes.json(), sRes.json()]);
        if (!alive) return;
        setForecast(fData);
        setAirQuality(aData);
        if (sData.daily?.sunrise?.[0] && sData.daily?.sunset?.[0]) {
          setSunData({ sunrise: sData.daily.sunrise[0], sunset: sData.daily.sunset[0] });
        }
      } catch (e) { console.error('Weather fetch error:', e); }
      finally { if (alive) setLoadingWeather(false); }
    })();
    return () => { alive = false; };
  }, [lat, lon]);

  // ── Geolocation ──
  const geolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLon(pos.coords.longitude); setCityName('Ma position'); },
      () => notify.error('Géolocalisation refusée'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const selectCity = (r: GeoResult) => {
    setLat(r.latitude); setLon(r.longitude); setCityName(r.name);
    setQuery(''); setGeoResults([]);
  };

  // ── React ──
  const toggleReaction = async (type: 'like' | 'useful') => {
    if (!session?.user) { notify.warning('Connecte-toi pour réagir'); return; }
    if (!bulletin?.id) return;
    try {
      const res = await fetch('/api/meteo/reactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletinId: bulletin.id, type }),
      });
      const data = await res.json();
      if (res.ok) {
        setReactions(prev => ({
          likes: data.counts?.likes ?? prev.likes,
          useful: data.counts?.useful ?? prev.useful,
          userReactions: data.reacted
            ? [...prev.userReactions.filter(r => r !== type), type]
            : prev.userReactions.filter(r => r !== type),
        }));
      }
    } catch {}
  };

  // ── Share ──
  const shareBulletin = async () => {
    if (!bulletin?.id) return;
    const url = `${window.location.origin}/meteo`;
    try {
      await navigator.clipboard.writeText(url);
      notify.success('Lien copié !');
      await fetch(`/api/meteo/bulletin/${bulletin.id}/share`, { method: 'POST' });
    } catch { notify.error('Erreur lors du partage'); }
  };

  // ── Comment ──
  const postComment = async () => {
    if (!session?.user || !bulletin?.id || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch('/api/meteo/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletinId: bulletin.id, content: commentText.trim() }),
      });
      if (res.ok) {
        setCommentText('');
        fetchComments();
        notify.success('Commentaire publié');
      }
    } catch {}
    finally { setSendingComment(false); }
  };

  // ── Derived data ──
  const hourIdx = useMemo(() => {
    const times = forecast?.hourly?.time || [];
    const h = now.getHours();
    const idx = times.findIndex((t: string) => new Date(t).getHours() === h && new Date(t).getDate() === now.getDate());
    return idx >= 0 ? idx : 0;
  }, [forecast, now]);

  const currentWeather = useMemo(() => {
    if (!forecast?.hourly) return null;
    const h = forecast.hourly;
    return {
      temp: h.temperature_2m?.[hourIdx],
      code: h.weathercode?.[hourIdx] ?? 0,
      wind: h.wind_speed_10m?.[hourIdx],
      humidity: h.relative_humidity_2m?.[hourIdx],
      uv: h.uv_index?.[hourIdx],
      precip: h.precipitation?.[hourIdx],
    };
  }, [forecast, hourIdx]);

  const risks = useMemo(() => computeRisks(forecast?.hourly), [forecast]);

  const uvData = useMemo(() => {
    const uv = airQuality?.hourly?.uv_index?.[hourIdx] ?? currentWeather?.uv ?? null;
    const pm25 = airQuality?.hourly?.pm2_5?.[hourIdx] ?? null;
    return { uv, pm25 };
  }, [airQuality, hourIdx, currentWeather]);

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  // ─── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white relative bg-[#0f0a1a]">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0a1a] via-[#110c20] to-[#0d0816]" />
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-violet-600/[0.06] rounded-full blur-[200px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-indigo-600/[0.04] rounded-full blur-[200px]" />
      </div>

      {/* ── 1. Active Alerts Banner ── */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-0">
          {visibleAlerts.map(alert => (
            <div key={alert.id} className={`border-b px-4 py-3 flex items-center justify-between gap-3 ${SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info}`}>
              <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{alert.title}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-current/30 font-medium">{alert.severity}</span>
                  </div>
                  {alert.regions?.length > 0 && (
                    <p className="text-xs opacity-80 mt-0.5">{alert.regions.join(', ')}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setDismissedAlerts(prev => { const s = new Set(Array.from(prev)); s.add(alert.id); return s; })} className="p-1 rounded-lg hover:bg-white/10 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-10 space-y-8">

        {/* ── 2. Hero Section ── */}
        <section>
          <div className="flex items-center gap-4 mb-3">
            <img src="/images/alertemps-logo.png" alt="Alertemps" className="h-10 md:h-12 w-auto" />
          </div>
          <div className="mb-8">
            <p className="text-white/40 text-sm capitalize">{frenchDate(now)}</p>
            <p className="text-[15px] text-white/40 mt-1">Donnees en temps reel & bulletins meteo</p>
          </div>

          {/* City Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.05]">
                <Search className="w-4 h-4 text-white/30" />
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher une ville…"
                  className="bg-transparent outline-none w-full text-[15px] placeholder:text-white/25"
                />
              </div>
              {geoResults.length > 0 && (
                <div className="absolute z-30 mt-2 w-full rounded-2xl bg-[#1a1230]/98 backdrop-blur-xl overflow-hidden shadow-2xl">
                  {geoResults.map(r => (
                    <button key={r.id} onClick={() => selectCity(r)}
                      className="w-full text-left px-4 py-3 hover:bg-white/[0.04] flex items-center gap-3 text-[15px]">
                      <MapPin className="w-4 h-4 text-white/30" />
                      <span className="truncate">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={geolocate}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white text-[15px] font-medium transition">
              <LocateFixed className="w-4 h-4" /> Me localiser
            </button>
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sunrise/Sunset */}
            <div className="rounded-2xl bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-amber-300/80 text-xs font-medium mb-4 font-medium">
                <Sun className="w-4 h-4 text-amber-400" /> Lever / Coucher
              </div>
              {sunData ? (
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <Sunrise className="w-8 h-8 text-amber-400 mx-auto mb-1" />
                    <p className="text-xl font-bold">{new Date(sunData.sunrise).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-xs text-white/40">Lever</p>
                  </div>
                  <div className="w-px h-12 bg-white/[0.06]" />
                  <div className="text-center">
                    <Sunset className="w-8 h-8 text-orange-400 mx-auto mb-1" />
                    <p className="text-xl font-bold">{new Date(sunData.sunset).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-xs text-white/40">Coucher</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-violet-400/40" /></div>
              )}
            </div>

            {/* Moon Phase */}
            <div className="rounded-2xl bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-violet-300/80 text-xs font-medium mb-4 font-medium">
                <Moon className="w-4 h-4 text-violet-300" /> Phase de lune
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center">
                  <Moon className="w-8 h-8 text-violet-300" />
                  <span className="absolute -bottom-1 -right-1 text-[10px] bg-violet-500/15 text-violet-200 px-1.5 py-0.5 rounded-full font-medium">
                    {moon.illumination}%
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{moon.name}</p>
                  <p className="text-xs text-white/40 mt-1">
                    Prochaine pleine lune : {moon.nextFull.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Weather Risks */}
            <div className="rounded-2xl bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-white/50 text-xs font-medium mb-4 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Risques du jour
              </div>
              {risks ? (
                <div className="space-y-2">
                  {risks.map(r => (
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="text-xs text-white/60 w-16 flex-shrink-0">{r.label}</span>
                      <div className="flex-1 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} className={`h-2 flex-1 rounded-sm ${n <= r.level ? r.color : 'bg-white/[0.04]'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] text-white/30 w-4 text-right">{r.level}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-violet-400/40" /></div>
              )}
            </div>
          </div>
        </section>

        {/* ── 3. Bulletin Alertemps ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-violet-400" /> Bulletin Alertemps
          </h2>
          {loadingBulletin ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-violet-400/40" /></div>
          ) : !bulletin ? (
            <div className="text-center text-white/30 py-16">
              <Cloud className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Aucun bulletin disponible pour le moment</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.04] overflow-hidden">
              {bulletin.image_url && (
                <div className="relative aspect-video bg-black/30">
                  <img src={bulletin.image_url} alt="Carte meteo" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="p-5 md:p-6 space-y-4">
                {/* Category + Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  {bulletin.category && CATEGORY_STYLES[bulletin.category] && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${CATEGORY_STYLES[bulletin.category].bg} ${CATEGORY_STYLES[bulletin.category].text}`}>
                      {CATEGORY_STYLES[bulletin.category].label}
                    </span>
                  )}
                  {bulletin.tags?.map((tag, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-full text-[11px] bg-white/[0.05] text-white/40">
                      {tag}
                    </span>
                  ))}
                </div>

                {bulletin.title && (
                  <h3 className="text-xl md:text-2xl font-bold leading-tight">{bulletin.title}</h3>
                )}
                {bulletin.content && (
                  <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{bulletin.content}</p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-4 text-xs text-white/30 pt-2">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(bulletin.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  {bulletin.views_count != null && <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {bulletin.views_count} vues</span>}
                </div>

                {/* Reactions Bar */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                  <button onClick={() => toggleReaction('like')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition ${reactions.userReactions.includes('like') ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.06]'}`}>
                    <Heart className={`w-4 h-4 ${reactions.userReactions.includes('like') ? 'fill-pink-400' : ''}`} />
                    {reactions.likes}
                  </button>
                  <button onClick={() => toggleReaction('useful')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition ${reactions.userReactions.includes('useful') ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.06]'}`}>
                    <ThumbsUp className={`w-4 h-4 ${reactions.userReactions.includes('useful') ? 'fill-violet-400' : ''}`} />
                    {reactions.useful}
                  </button>
                  <button onClick={shareBulletin}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-white/[0.04] text-white/50 hover:bg-white/[0.06] transition ml-auto">
                    <Share2 className="w-4 h-4" /> Partager
                  </button>
                </div>

                {/* Comments */}
                {bulletin.allow_comments !== false && (
                  <div className="pt-3 border-t border-white/[0.06]">
                    <button onClick={() => setShowComments(v => !v)}
                      className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition">
                      <MessageCircle className="w-4 h-4" />
                      {commentCount} commentaire{commentCount !== 1 ? 's' : ''}
                      <ChevronRight className={`w-4 h-4 transition-transform ${showComments ? 'rotate-90' : ''}`} />
                    </button>

                    {showComments && (
                      <div className="mt-4 space-y-3">
                        {session?.user && (
                          <div className="flex gap-2">
                            <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                              placeholder="Écrire un commentaire…"
                              className="flex-1 bg-white/[0.05] rounded-2xl px-4 py-3 text-[15px] placeholder:text-white/25 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20" rows={2} />
                            <button onClick={postComment} disabled={sendingComment || !commentText.trim()}
                              className="self-end px-3 py-2 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-30 transition">
                              {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                        {!session?.user && (
                          <p className="text-xs text-white/30">Connecte-toi pour commenter.</p>
                        )}

                        {comments.map(c => (
                          <div key={c.id} className="flex gap-3 p-3 rounded-xl bg-white/[0.03]">
                            <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0 text-xs font-bold text-white/40">
                              {c.profiles?.avatar ? (
                                <img src={c.profiles.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                (c.profiles?.name?.[0] || '?').toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{c.profiles?.name || 'Anonyme'}</span>
                                <span className="text-[10px] text-white/25">{timeAgo(c.created_at)}</span>
                              </div>
                              <p className="text-sm text-white/60 mt-1">{c.content}</p>
                              {c.reply_count > 0 && (
                                <p className="text-[10px] text-white/25 mt-1">{c.reply_count} réponse{c.reply_count > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── 4. Bulletin History ── */}
        {recentBulletins.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-white/40" /> Bulletins précédents
            </h2>
            <div className="relative">
              <div ref={historyRef} className="flex gap-4 overflow-x-auto pb-3 no-scrollbar snap-x">
                {recentBulletins.map(b => (
                  <a key={b.id} href={`/meteo/bulletin/${b.id}`}
                    className="flex-shrink-0 w-56 rounded-xl bg-white/[0.04] overflow-hidden hover:border-white/[0.12] transition snap-start group">
                    {b.image_url ? (
                      <div className="aspect-video bg-black/30">
                        <img src={b.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="aspect-video bg-white/[0.02] flex items-center justify-center">
                        <Cloud className="w-8 h-8 text-white/10" />
                      </div>
                    )}
                    <div className="p-3">
                      {b.category && CATEGORY_STYLES[b.category] && (
                        <span className={`inline-flex text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${CATEGORY_STYLES[b.category].bg} ${CATEGORY_STYLES[b.category].text} mb-1.5`}>
                          {CATEGORY_STYLES[b.category].label}
                        </span>
                      )}
                      <p className="text-sm font-medium truncate">{b.title || 'Bulletin météo'}</p>
                      <p className="text-[10px] text-white/25 mt-1">{new Date(b.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 5. Real-time Data ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" /> Données en temps réel — {cityName}
          </h2>

          {loadingWeather ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-violet-400/40" /></div>
          ) : (
            <div className="space-y-6">

              {/* Current Weather Summary */}
              {currentWeather && (
                <div className="rounded-2xl bg-white/[0.04] p-6 flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex items-center gap-4">
                    {(() => { const w = getWeatherIcon(currentWeather.code); return <w.Icon className={`w-16 h-16 ${w.color}`} />; })()}
                    <div>
                      <p className="text-4xl font-bold">{currentWeather.temp != null ? Math.round(currentWeather.temp) : '—'}°C</p>
                      <p className="text-sm text-white/40">{getWeatherIcon(currentWeather.code).label}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 w-full">
                    <div className="text-center p-3 rounded-xl bg-white/[0.04]">
                      <Wind className="w-5 h-5 mx-auto text-teal-400 mb-1" />
                      <p className="text-lg font-semibold">{currentWeather.wind ?? '—'}</p>
                      <p className="text-[10px] text-white/30">km/h</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.04]">
                      <Droplets className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                      <p className="text-lg font-semibold">{currentWeather.humidity ?? '—'}%</p>
                      <p className="text-[10px] text-white/30">Humidité</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.04]">
                      <CloudRain className="w-5 h-5 mx-auto text-blue-300 mb-1" />
                      <p className="text-lg font-semibold">{currentWeather.precip ?? 0}</p>
                      <p className="text-[10px] text-white/30">mm pluie</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.04]">
                      <Sun className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
                      <p className="text-lg font-semibold">{currentWeather.uv ?? '—'}</p>
                      <p className="text-[10px] text-white/30">UV Index</p>
                    </div>
                  </div>
                </div>
              )}

              {/* UV & Air Quality */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/[0.04] p-5">
                  <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-400" /> Indice UV
                  </h3>
                  {(() => {
                    const uv = uvData.uv;
                    if (uv == null) return <p className="text-white/20 text-sm">Données indisponibles</p>;
                    const uvInt = Math.round(uv);
                    let label: string, color: string;
                    if (uvInt <= 2) { label = 'Faible'; color = 'text-emerald-400'; }
                    else if (uvInt <= 5) { label = 'Modéré'; color = 'text-yellow-400'; }
                    else if (uvInt <= 7) { label = 'Élevé'; color = 'text-orange-400'; }
                    else if (uvInt <= 10) { label = 'Très élevé'; color = 'text-red-400'; }
                    else { label = 'Extrême'; color = 'text-purple-400'; }
                    return (
                      <div className="flex items-center gap-4">
                        <span className={`text-4xl font-bold ${color}`}>{uvInt}</span>
                        <div>
                          <p className={`text-sm font-medium ${color}`}>{label}</p>
                          <div className="flex gap-0.5 mt-2 w-40">
                            {Array.from({ length: 11 }, (_, i) => (
                              <div key={i} className={`h-2 flex-1 rounded-sm ${i < uvInt ? (i < 3 ? 'bg-emerald-500' : i < 6 ? 'bg-yellow-500' : i < 8 ? 'bg-orange-500' : 'bg-red-500') : 'bg-white/[0.04]'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="rounded-2xl bg-white/[0.04] p-5">
                  <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" /> Qualité de l'air
                  </h3>
                  {(() => {
                    const pm = uvData.pm25;
                    if (pm == null) return <p className="text-white/20 text-sm">Données indisponibles</p>;
                    let label: string, color: string, emoji: string;
                    if (pm <= 10) { label = 'Excellent'; color = 'text-emerald-400'; emoji = '😊'; }
                    else if (pm <= 25) { label = 'Bon'; color = 'text-green-400'; emoji = '🙂'; }
                    else if (pm <= 50) { label = 'Moyen'; color = 'text-yellow-400'; emoji = '😐'; }
                    else if (pm <= 75) { label = 'Dégradé'; color = 'text-orange-400'; emoji = '😷'; }
                    else { label = 'Mauvais'; color = 'text-red-400'; emoji = '🤢'; }
                    return (
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{emoji}</span>
                        <div>
                          <p className={`text-sm font-medium ${color}`}>{label}</p>
                          <p className="text-xs text-white/30 mt-1">PM2.5 : {Math.round(pm)} µg/m³</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Radar placeholder */}
              <div className="rounded-2xl bg-white/[0.04] p-5">
                <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-blue-400" /> Radar précipitations
                </h3>
                <div className="aspect-[2/1] bg-white/[0.02] rounded-xl flex items-center justify-center border border-white/[0.04]">
                  <a href={`https://www.rainviewer.com/map.html?loc=${lat},${lon},7&oCS=1&oAP=1&c=1&o=1&lm=1&layer=radar&sm=1&sn=1`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-3 text-white/30 hover:text-white/50 transition group">
                    <CloudRain className="w-12 h-12 group-hover:text-blue-400 transition" />
                    <span className="flex items-center gap-1.5 text-sm">
                      Voir le radar en direct <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </a>
                </div>
              </div>

              {/* 5-day Forecast */}
              {forecast?.daily?.time && (
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-red-400" /> Prévisions 5 jours
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {(forecast.daily.time as string[]).slice(1, 6).map((day: string, i: number) => {
                      const idx = i + 1;
                      const code = forecast.daily.weathercode?.[idx] ?? 0;
                      const tMax = forecast.daily.temperature_2m_max?.[idx];
                      const tMin = forecast.daily.temperature_2m_min?.[idx];
                      const pop = forecast.daily.precipitation_probability_max?.[idx];
                      const w = getWeatherIcon(code);
                      return (
                        <div key={day} className="rounded-xl bg-white/[0.04] p-4 text-center">
                          <p className="text-xs text-white/40 capitalize mb-2">
                            {new Date(day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                          </p>
                          <w.Icon className={`w-10 h-10 mx-auto mb-2 ${w.color}`} />
                          <div className="flex items-baseline justify-center gap-2">
                            <span className="text-xl font-bold">{tMax != null ? Math.round(tMax) : '—'}°</span>
                            <span className="text-sm text-white/30">{tMin != null ? Math.round(tMin) : '—'}°</span>
                          </div>
                          {pop != null && (
                            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-blue-300/60">
                              <Droplets className="w-3 h-3" /> {pop}%
                            </div>
                          )}
                          <p className="text-[10px] text-white/20 mt-1">{w.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── 6. Footer ── */}
        <footer className="mt-8 pt-6 border-t border-white/[0.06] text-center text-xs text-white/25 pb-4">
          Données : Open-Meteo, RainViewer | Bulletins : Alertemps | Intégré à Synaura
        </footer>
      </main>
    </div>
  );
}
