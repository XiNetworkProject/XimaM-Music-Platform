'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  Calendar,
  AlertCircle,
  ExternalLink,
  Youtube,
  Instagram,
  Facebook,
  Globe,
  MapPin,
  LocateFixed,
  Search,
  Wind,
  Droplets,
  Sun,
  Gauge,
  Activity,
  ChevronRight,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudSun,
  CloudSunRain,
  Snowflake,
  Zap,
} from 'lucide-react';

/**
 * Synaura – Météo (même style visuel que ta page)
 *
 * - ⚠️ Aucune dépendance à framer-motion (évite l'erreur d'import)
 * - 🎨 Palette & tokens 100% basés sur tes variables CSS :
 *   bg-[var(--background)], bg-[var(--surface)], bg-[var(--surface-2)], border-[var(--border)],
 *   text-[var(--text-primary)], text-[var(--text-secondary)], text-[var(--text-muted)]
 * - 🧪 Tests intégrés (Diagnostics) conservés mais discrets, mêmes couleurs
 * - 🔌 Données : Open‑Meteo (forecast + air quality), RainViewer (radar), /api/meteo/public (bulletin)
 */

// ===== Composants UI =====
const SectionTitle = ({ icon: Icon, title, actionLabel, onAction }: { icon: any; title: string; actionLabel?: string; onAction?: () => void }) => (
  <div className="flex items-center justify-between mb-2 md:mb-3">
    <div className="flex items-center gap-1.5 md:gap-2 text-[var(--text-primary)]">
      <Icon className="w-4 h-4 md:w-5 md:h-5" />
      <h3 className="text-base md:text-lg font-semibold tracking-tight">{title}</h3>
    </div>
    {actionLabel && (
      <button onClick={onAction} className="text-[10px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition">
        {actionLabel}
      </button>
    )}
  </div>
);

// ===== Types =====
interface Bulletin {
  id: string;
  title?: string;
  content?: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

interface GeocodeResult {
  id: number;
  name: string;
  country: string;
  country_code: string;
  admin1?: string;
  admin2?: string;
  latitude: number;
  longitude: number;
}

interface HourlyForecast {
  time: string[];
  temperature_2m?: number[];
  precipitation?: number[];
  precipitation_probability?: number[];
  wind_speed_10m?: number[];
  wind_gusts_10m?: number[];
  cloudcover?: number[];
  relative_humidity_2m?: number[];
  uv_index?: number[];
}

interface DailyForecast {
  time: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: number[];
  sunrise?: string[];
  sunset?: string[];
}

interface ForecastResponse {
  timezone?: string;
  hourly?: HourlyForecast;
  daily?: DailyForecast;
}

interface AirQualityResponse {
  hourly?: {
    time: string[];
    pm10?: number[];
    pm2_5?: number[];
    ozone?: number[];
    nitrogen_dioxide?: number[];
    carbon_monoxide?: number[];
    sulphur_dioxide?: number[];
  };
}

const DEFAULT_LOC = {
  id: 1,
  name: 'Lille (FR)',
  country: 'France',
  country_code: 'FR',
  admin2: 'Nord',
  latitude: 50.62925,
  longitude: 3.057256,
};

type TabKey = 'now' | 'hourly' | 'daily' | 'radar' | 'air' | 'bulletin';

export default function MeteoStyledPage() {
  // ===== ÉTATS =====
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [loadingBulletin, setLoadingBulletin] = useState(true);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loc, setLoc] = useState<GeocodeResult>(DEFAULT_LOC as GeocodeResult);
  const [activeTab, setActiveTab] = useState<TabKey>('now');

  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [air, setAir] = useState<AirQualityResponse | null>(null);
  const [loadingWx, setLoadingWx] = useState(false);

  const radarRef = useRef<HTMLDivElement | null>(null);
  const rainviewerLoaded = useRef(false);

  // === Diagnostics ===
  const [diagOpen, setDiagOpen] = useState(false);
  const [diag, setDiag] = useState<null | { steps: { name: string; ok: boolean; info?: string }[] }>(null);

  async function runDiagnostics() {
    const steps: { name: string; ok: boolean; info?: string }[] = [];
    try {
      const g = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=Lille&count=1&language=fr');
      const gj = await g.json();
      steps.push({ name: 'Geocoding (Lille)', ok: !!gj?.results?.length, info: gj?.results?.[0]?.name });
    } catch (e: any) {
      steps.push({ name: 'Geocoding (Lille)', ok: false, info: String(e) });
    }
    try {
      const fr = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&timezone=auto&hourly=temperature_2m`);
      const fj = await fr.json();
      steps.push({ name: 'Forecast (temperature_2m)', ok: !!fj?.hourly?.time?.length, info: `${fj?.hourly?.time?.length ?? 0} points` });
    } catch (e: any) {
      steps.push({ name: 'Forecast', ok: false, info: String(e) });
    }
    try {
      const ar = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.latitude}&longitude=${loc.longitude}&timezone=auto&hourly=pm2_5`);
      const aj = await ar.json();
      steps.push({ name: 'Air quality (pm2_5)', ok: !!aj?.hourly?.time?.length, info: `${aj?.hourly?.time?.length ?? 0} points` });
    } catch (e: any) {
      steps.push({ name: 'Air quality', ok: false, info: String(e) });
    }
    setDiag({ steps });
  }

  // ===== EFFECTS =====
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('meteo:last') : null;
    if (raw) {
      try { setLoc(JSON.parse(raw)); } catch {}
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('meteo:last', JSON.stringify(loc)); } catch {}
  }, [loc]);

  // Bulletin
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingBulletin(true);
      try {
        const res = await fetch(`/api/meteo/public?source=meteo_page&_ts=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        if (res.ok && data.bulletin) setBulletin(data.bulletin);
      } catch (e) { console.error('Erreur bulletin:', e); }
      finally { if (alive) setLoadingBulletin(false); }
    })();
    return () => { alive = false; };
  }, []);

  // Géocoding
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const id = setTimeout(async () => {
      try {
        const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
        url.searchParams.set('name', query);
        url.searchParams.set('count', '6');
        url.searchParams.set('language', 'fr');
        const r = await fetch(url.toString());
        const j = await r.json();
        setResults((j?.results || []).map((x: any, i: number) => ({
          id: x.id ?? i,
          name: `${x.name}${x.admin1 ? ', ' + x.admin1 : ''}${x.country_code ? ' (' + x.country_code + ')' : ''}`,
          country: x.country,
          country_code: x.country_code,
          admin1: x.admin1,
          admin2: x.admin2,
          latitude: x.latitude,
          longitude: x.longitude,
        })));
      } catch (e) { console.error(e); }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  // Forecast + Air
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingWx(true);
      try {
        const base = 'https://api.open-meteo.com/v1/forecast';
        const params = new URLSearchParams({
          latitude: String(loc.latitude),
          longitude: String(loc.longitude),
          timezone: 'auto',
          hourly: [
            'temperature_2m','precipitation','precipitation_probability','relative_humidity_2m','wind_speed_10m','wind_gusts_10m','cloudcover','uv_index'
          ].join(','),
          daily: ['temperature_2m_max','temperature_2m_min','precipitation_probability_max','sunrise','sunset'].join(','),
        }).toString();
        const fr = await fetch(`${base}?${params}`);
        const fjson = await fr.json();

        const aurl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
        aurl.searchParams.set('latitude', String(loc.latitude));
        aurl.searchParams.set('longitude', String(loc.longitude));
        aurl.searchParams.set('timezone', 'auto');
        aurl.searchParams.set('hourly', ['pm10','pm2_5','ozone','nitrogen_dioxide','sulphur_dioxide','carbon_monoxide'].join(','));
        const ar = await fetch(aurl.toString());
        const ajson = await ar.json();

        if (!alive) return;
        setForecast(fjson);
        setAir(ajson);
      } catch (e) { console.error(e); }
      finally { if (alive) setLoadingWx(false); }
    })();
    return () => { alive = false; };
  }, [loc.latitude, loc.longitude]);

  // RainViewer — load on tab open
  useEffect(() => {
    if (activeTab !== 'radar' || rainviewerLoaded.current) return;
    const s = document.createElement('script');
    s.src = 'https://api.rainviewer.com/public/js/rainviewer-2.0.min.js';
    s.async = true;
    s.onload = () => {
      rainviewerLoaded.current = true;
      try {
        // @ts-ignore
        if (window.RainViewer && radarRef.current) {
          // @ts-ignore
          const player = new window.RainViewer.Player(radarRef.current, {
            position: [loc.latitude, loc.longitude],
            zoom: 6,
            animationSpeed: 40,
            opacity: 85,
            coverage: 'europe',
            controls: true,
          });
          player.setMapCenter([loc.latitude, loc.longitude]);
        }
      } catch (e) { console.warn('RainViewer init error', e); }
    };
    s.onerror = () => console.warn('RainViewer blocked');
    document.body.appendChild(s);
  }, [activeTab, loc.latitude, loc.longitude]);

  // ===== Helpers =====
  const now = new Date();
  const hourLabel = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit' });
  const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

  // Fonction pour déterminer l'icône météo selon les conditions
  const getWeatherIcon = (params: {
    precipitation?: number | null;
    precipitationProbability?: number | null;
    cloudcover?: number | null;
    temperature?: number | null;
    isNight?: boolean;
  }) => {
    const { precipitation = 0, precipitationProbability = 0, cloudcover = 0, temperature = 0, isNight = false } = params;
    const pop = precipitationProbability ?? 0;
    const prec = precipitation ?? 0;
    const cloud = cloudcover ?? 0;
    const temp = temperature ?? 0;
    
    // Forte probabilité de pluie (>50%) ou précipitations importantes (>1mm)
    if (pop > 50 || prec > 1) {
      // Température < 0°C = neige
      if (temp < 0) {
        return { Icon: Snowflake, color: 'text-cyan-300', label: 'Neige' };
      }
      // Orage si précipitations très fortes
      if (pop > 80 && prec > 5) {
        return { Icon: CloudLightning, color: 'text-yellow-500', label: 'Orage' };
      }
      // Pluie normale
      return { Icon: CloudRain, color: 'text-blue-400', label: 'Pluie' };
    }
    
    // Nuageux (couverture > 70%)
    if (cloud > 70) {
      return { Icon: Cloud, color: 'text-gray-400', label: 'Nuageux' };
    }
    
    // Partiellement nuageux (30-70%)
    if (cloud > 30) {
      return { Icon: CloudSun, color: 'text-gray-300', label: 'Partiellement nuageux' };
    }
    
    // Ensoleillé
    return { Icon: Sun, color: 'text-yellow-400', label: 'Ensoleillé' };
  };

  const currentHourIndex = useMemo(() => {
    const t = forecast?.hourly?.time ?? [];
    if (!t.length) return 0;
    const idx = t.findIndex((iso) => new Date(iso).getHours() === now.getHours() && new Date(iso).getDate() === now.getDate());
    return idx >= 0 ? idx : 0;
  }, [forecast?.hourly?.time]);

  const cur = {
    temp: forecast?.hourly?.temperature_2m?.[currentHourIndex] ?? null,
    pop: forecast?.hourly?.precipitation_probability?.[currentHourIndex] ?? null,
    rain: forecast?.hourly?.precipitation?.[currentHourIndex] ?? null,
    wind: forecast?.hourly?.wind_speed_10m?.[currentHourIndex] ?? null,
    gust: forecast?.hourly?.wind_gusts_10m?.[currentHourIndex] ?? null,
    hum: forecast?.hourly?.relative_humidity_2m?.[currentHourIndex] ?? null,
    cloud: forecast?.hourly?.cloudcover?.[currentHourIndex] ?? null,
    uv: forecast?.hourly?.uv_index?.[currentHourIndex] ?? null,
  };

  const airNow = useMemo(() => {
    const a = air?.hourly;
    if (!a?.time?.length) return null;
    const i = Math.min(a.time.length - 1, currentHourIndex);
    const pm25 = a.pm2_5?.[i] ?? null;
    const pm10 = a.pm10?.[i] ?? null;
    const o3 = a.ozone?.[i] ?? null;
    function cat(v?: number | null) {
      if (v == null) return { label: '—', badge: 'bg-zinc-600', advice: 'Données indisponibles' };
      if (v <= 10) return { label: 'Très bon', badge: 'bg-emerald-600', advice: 'OK pour activités' };
      if (v <= 20) return { label: 'Bon', badge: 'bg-emerald-700', advice: 'OK pour tous' };
      if (v <= 25) return { label: 'Moyen', badge: 'bg-yellow-600', advice: 'Sensibles : modérer' };
      if (v <= 50) return { label: 'Dégradé', badge: 'bg-orange-600', advice: 'Réduire intense' };
      return { label: 'Mauvais', badge: 'bg-red-600', advice: 'Éviter effort prolongé' };
    }
    return { pm25, pm10, o3, cat: cat(pm25) };
  }, [air, currentHourIndex]);

  // ===== UI =====
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-6xl px-3 sm:px-4 md:px-6 py-4 md:py-6 pt-6 md:pt-8 space-y-4 md:space-y-6">
        {/* HERO / Header (carte ou dégradé, bordures Synaura) */}
        <div className="relative w-full h-[200px] md:h-[260px] rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
          {bulletin?.image_url ? (
            <img src={bulletin.image_url} alt="Carte météo Alertemps" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[var(--surface-2)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-6 md:right-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-2 md:gap-3">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 md:gap-2 px-2 py-0.5 md:py-1 rounded-full bg-blue-500/10 border border-[var(--border)] text-[10px] md:text-xs text-[var(--text-secondary)]">
                <Cloud className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Météo Alertemps</span><span className="sm:hidden">Alertemps</span>
              </div>
              <h1 className="mt-1.5 md:mt-2 text-base md:text-xl lg:text-2xl font-bold leading-tight">Prévisions locales & bulletin partenaire</h1>
              <p className="text-xs md:text-sm text-[var(--text-muted)] mt-0.5">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • Europe/Paris</p>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <button
                onClick={() => setDiagOpen((v) => !v)}
                className="px-2 md:px-3 py-1 md:py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-[10px] md:text-xs text-[var(--text-secondary)]"
                aria-label="Ouvrir les diagnostics"
              >
                <span className="hidden sm:inline">Diagnostics</span><span className="sm:hidden">Diag</span>
              </button>
              <button onClick={() => setActiveTab('bulletin')} className="px-2 md:px-3 py-1 md:py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-[10px] md:text-sm inline-flex items-center gap-1 md:gap-2 text-[var(--text-secondary)]">
                <span className="hidden sm:inline">Voir le bulletin</span><span className="sm:hidden">Bulletin</span> <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostics */}
        {diagOpen && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <SectionTitle icon={Activity} title="Diagnostics & tests" actionLabel="Lancer" onAction={runDiagnostics} />
            </div>
            {!diag && (
              <p className="text-[var(--text-secondary)] text-sm">Clique sur "Lancer" pour vérifier : Geocoding, Prévisions, Qualité de l'air.</p>
            )}
            {diag && (
              <ul className="mt-2 space-y-2 text-sm">
                {diag.steps.map((s, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>{s.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] text-white ${s.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>{s.ok ? 'OK' : 'Échec'}</span>
                    {s.info && <span className="text-[var(--text-muted)] ml-2">{s.info}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Recherche / géoloc */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <div className="relative flex-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
              <input
                className="bg-transparent outline-none w-full placeholder-[var(--text-muted)] text-[var(--text-primary)]"
                placeholder="Rechercher une ville (ex: Wattignies)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {!!results.length && (
              <div className="absolute z-20 mt-2 w-full rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
                {results.map((r) => (
                  <button
                    key={r.id}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--surface-2)] flex items-center gap-2"
                    onClick={() => { setLoc(r); setResults([]); setQuery(''); }}
                  >
                    <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="truncate text-[var(--text-primary)]">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (!('geolocation' in navigator)) return;
              navigator.geolocation.getCurrentPosition(
                (pos) => setLoc({ id: Date.now(), name: 'Ma position', country: '', country_code: '', latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                () => {},
                { enableHighAccuracy: true, timeout: 10000 }
              );
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-[var(--border)] text-[var(--text-primary)]"
          >
            <LocateFixed className="w-4 h-4" /> Me localiser
          </button>
        </div>

        {/* Widgets résumé */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {/* Maintenant */}
          <div data-testid="widget-now" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 md:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <div className="p-1.5 md:p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex-shrink-0">
                {(() => {
                  const weatherIcon = getWeatherIcon({
                    precipitation: cur.rain,
                    precipitationProbability: cur.pop,
                    cloudcover: cur.cloud,
                    temperature: cur.temp,
                  });
                  const Icon = weatherIcon.Icon;
                  return <Icon className={`w-4 h-4 md:w-5 md:h-5 ${weatherIcon.color}`} />;
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-semibold text-[var(--text-primary)] truncate">Météo — {loc.name}</p>
                <p className="text-[10px] md:text-xs text-[var(--text-muted)]">Nuages {cur.cloud ?? '—'}% • UV {cur.uv ?? '—'}</p>
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)] flex-shrink-0 ml-2">{cur.temp != null ? Math.round(cur.temp) : '—'}°C</div>
          </div>

          {/* Air */}
          <div data-testid="widget-air" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex-shrink-0"><Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm font-semibold text-[var(--text-primary)]">Qualité de l'air</p>
                <div className={`inline-flex items-center gap-1 md:gap-2 px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-[10px] text-white mt-1 ${airNow?.cat.badge ?? 'bg-zinc-600'}`}>{airNow?.cat.label ?? '—'}</div>
              </div>
            </div>
            <div className="mt-2 md:mt-3 grid grid-cols-3 gap-1.5 md:gap-2 text-[10px] md:text-xs">
              <div className="p-1.5 md:p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[var(--text-muted)]">PM2.5</div><div className="text-xs md:text-sm font-semibold text-[var(--text-primary)]">{airNow?.pm25 ?? '—'}</div></div>
              <div className="p-1.5 md:p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[var(--text-muted)]">PM10</div><div className="text-xs md:text-sm font-semibold text-[var(--text-primary)]">{airNow?.pm10 ?? '—'}</div></div>
              <div className="p-1.5 md:p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[var(--text-muted)]">O₃</div><div className="text-xs md:text-sm font-semibold text-[var(--text-primary)]">{airNow?.o3 ?? '—'}</div></div>
            </div>
          </div>

          {/* Pluie/Vent */}
          <div data-testid="widget-wind" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 md:p-4">
            <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm text-[var(--text-primary)]">
              <div className="flex items-center gap-1.5 md:gap-2">
                <Droplets className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">Pluie </span>{cur.pop ?? '—'}%
                  <span className="hidden md:inline"> ({cur.rain ?? 0} mm)</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Wind className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">Vent </span>{cur.wind ?? '—'} km/h
                  <span className="hidden md:inline"> (raf. {cur.gust ?? '—'})</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Gauge className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">Humidité </span>{cur.hum ?? '—'}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Sun className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">UV </span>{cur.uv ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {([
            { key: 'now', label: 'Maintenant', labelMobile: 'Maintenant' },
            { key: 'hourly', label: 'Heure par heure', labelMobile: 'Heures' },
            { key: 'daily', label: '7 jours', labelMobile: '7 jours' },
            { key: 'radar', label: 'Radar', labelMobile: 'Radar' },
            { key: 'air', label: 'Air / Pollen', labelMobile: 'Air' },
            { key: 'bulletin', label: 'Bulletins', labelMobile: 'Bulletins' },
          ] as { key: TabKey; label: string; labelMobile: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl border text-xs md:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === t.key ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}`}
            >
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.labelMobile}</span>
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        <div className="space-y-4">
          {/* NOW — mini-charts 12 prochaines heures */}
          {activeTab === 'now' && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 md:p-4">
              <SectionTitle icon={Cloud} title="Prochaines heures" />
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5 md:gap-2 text-[10px] md:text-xs overflow-x-auto -mx-1 px-1">
                {(forecast?.hourly?.time || []).slice(currentHourIndex, currentHourIndex + 12).map((t, i) => {
                  const idx = (currentHourIndex ?? 0) + i;
                  const temp = forecast?.hourly?.temperature_2m?.[idx] ?? 0;
                  const pop = forecast?.hourly?.precipitation_probability?.[idx] ?? 0;
                  const rain = forecast?.hourly?.precipitation?.[idx] ?? 0;
                  const cloud = forecast?.hourly?.cloudcover?.[idx] ?? 0;
                  const weatherIcon = getWeatherIcon({
                    precipitation: rain,
                    precipitationProbability: pop,
                    cloudcover: cloud,
                    temperature: temp,
                  });
                  const Icon = weatherIcon.Icon;
                  return (
                    <div key={t} className="flex flex-col items-center gap-0.5 md:gap-1 min-w-[50px]">
                      <div className="text-[var(--text-muted)] text-[9px] md:text-[10px]">{hourLabel(t)}</div>
                      <Icon className={`w-4 h-4 md:w-5 md:h-5 ${weatherIcon.color}`} />
                      <div className="font-medium text-[var(--text-primary)] text-xs md:text-sm">{Math.round(temp)}°</div>
                      <div className="w-5 h-8 md:w-6 md:h-10 relative">
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-500/30 rounded" style={{ height: `${Math.min(pop, 100)}%` }} />
                      </div>
                      <div className="text-[var(--text-muted)] text-[9px] md:text-[10px]">{pop}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HOURLY — tableau 48h */}
          {activeTab === 'hourly' && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2 overflow-x-auto -mx-1 px-1">
              <table className="min-w-[720px] w-full text-[10px] md:text-xs lg:text-sm">
                <thead className="text-[var(--text-muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-1.5 md:py-2 text-left px-1 md:px-2">Heure</th>
                    <th className="py-1.5 md:py-2 text-left px-1 md:px-2">Météo</th>
                    <th className="py-1.5 md:py-2 text-left px-1 md:px-2">Temp°</th>
                    <th className="py-1.5 md:py-2 text-left px-1 md:px-2">Pluie%</th>
                    <th className="py-1.5 md:py-2 text-left px-1 md:px-2 hidden sm:table-cell">Vent</th>
                    <th className="py-1.5 md:py-2 text-left px-1 md:px-2 hidden md:table-cell">Rafales</th>
                    <th className="py-1.5 md:py-2 text-left px-1 md:px-2 hidden lg:table-cell">Humidité</th>
                    <th className="py-1.5 md:py-2 text-left px-1 md:px-2 hidden lg:table-cell">Nuages%</th>
                    <th className="py-1.5 md:py-2 text-left px-1 md:px-2 hidden xl:table-cell">UV</th>
                  </tr>
                </thead>
                <tbody>
                  {(forecast?.hourly?.time || []).slice(0, 48).map((t, i) => {
                    const temp = forecast?.hourly?.temperature_2m?.[i] ?? 0;
                    const pop = forecast?.hourly?.precipitation_probability?.[i] ?? 0;
                    const rain = forecast?.hourly?.precipitation?.[i] ?? 0;
                    const cloud = forecast?.hourly?.cloudcover?.[i] ?? 0;
                    const weatherIcon = getWeatherIcon({
                      precipitation: rain,
                      precipitationProbability: pop,
                      cloudcover: cloud,
                      temperature: temp,
                    });
                    const Icon = weatherIcon.Icon;
                    return (
                      <tr key={t} className="border-b border-[var(--border)]/60">
                        <td className="py-1.5 md:py-2 text-[var(--text-primary)] px-1 md:px-2">{hourLabel(t)}</td>
                        <td className="py-1.5 md:py-2 px-1 md:px-2">
                          <Icon className={`w-4 h-4 md:w-5 md:h-5 ${weatherIcon.color}`} title={weatherIcon.label} />
                        </td>
                        <td className="py-1.5 md:py-2 text-[var(--text-primary)] px-1 md:px-2 font-medium">{Math.round(temp)}°</td>
                        <td className="py-1.5 md:py-2 text-[var(--text-primary)] px-1 md:px-2">{pop}%</td>
                        <td className="py-1.5 md:py-2 text-[var(--text-primary)] px-1 md:px-2 hidden sm:table-cell">{forecast?.hourly?.wind_speed_10m?.[i] ?? '—'} km/h</td>
                        <td className="py-1.5 md:py-2 text-[var(--text-primary)] px-1 md:px-2 hidden md:table-cell">{forecast?.hourly?.wind_gusts_10m?.[i] ?? '—'}</td>
                        <td className="py-1.5 md:py-2 text-[var(--text-primary)] px-1 md:px-2 hidden lg:table-cell">{forecast?.hourly?.relative_humidity_2m?.[i] ?? '—'}%</td>
                        <td className="py-1.5 md:py-2 text-[var(--text-primary)] px-1 md:px-2 hidden lg:table-cell">{cloud}%</td>
                        <td className="py-1.5 md:py-2 text-[var(--text-primary)] px-1 md:px-2 hidden xl:table-cell">{forecast?.hourly?.uv_index?.[i] ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* DAILY — 7 jours */}
          {activeTab === 'daily' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {(forecast?.daily?.time || []).slice(0, 7).map((d, i) => {
                const popMax = forecast?.daily?.precipitation_probability_max?.[i] ?? 0;
                const tempMax = forecast?.daily?.temperature_2m_max?.[i] ?? 0;
                const tempMin = forecast?.daily?.temperature_2m_min?.[i] ?? 0;
                const tempAvg = (tempMax + tempMin) / 2;
                // Pour les prévisions quotidiennes, on utilise une estimation de la couverture nuageuse
                // basée sur la probabilité de précipitation (plus de pluie = plus de nuages)
                const estimatedCloudcover = popMax > 50 ? 80 : popMax > 30 ? 50 : 20;
                const weatherIcon = getWeatherIcon({
                  precipitation: null,
                  precipitationProbability: popMax,
                  cloudcover: estimatedCloudcover,
                  temperature: tempAvg,
                });
                const Icon = weatherIcon.Icon;
                return (
                  <div key={d} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-[var(--text-primary)]">{dayLabel(d)}</div>
                      <Icon className={`w-8 h-8 ${weatherIcon.color}`} title={weatherIcon.label} />
                    </div>
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">Pluie {popMax}%</div>
                    <div className="mt-3 flex items-baseline gap-3">
                      <div className="text-3xl font-bold text-[var(--text-primary)]">{Math.round(tempMax)}°</div>
                      <div className="text-[var(--text-muted)]">min {Math.round(tempMin)}°</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RADAR */}
          {activeTab === 'radar' && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2">
              <div ref={radarRef} className="w-full h-[50vh] md:h-[60vh] rounded-xl overflow-hidden bg-[var(--surface-2)]" />
              <div className="p-2 md:p-3 text-[10px] md:text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-1.5 md:gap-2">
                <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                <span>Si le radar ne s'affiche pas, <a className="text-blue-400 hover:text-blue-300 underline" href="https://www.rainviewer.com/weather-radar-map-live.html" target="_blank" rel="noreferrer">ouvrir RainViewer</a>.</span>
              </div>
            </div>
          )}

          {/* AIR */}
          {activeTab === 'air' && (
            <div className="grid md:grid-cols-2 gap-3 md:gap-4">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 md:p-5">
                <SectionTitle icon={Activity} title="Indice & conseils" />
                <div className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm text-white ${airNow?.cat.badge ?? 'bg-zinc-600'}`}>{airNow?.cat.label ?? '—'}</div>
                <div className="mt-2 md:mt-3 text-xs md:text-sm text-[var(--text-secondary)]">{airNow?.cat.advice ?? '—'}</div>
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 md:p-5">
                <div className="text-xs md:text-sm font-semibold mb-2 md:mb-3 text-[var(--text-primary)]">Polluants (μg/m³)</div>
                <div className="grid grid-cols-3 gap-2 md:gap-3 text-xs md:text-sm">
                  <div className="p-2 md:p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[var(--text-muted)] text-[10px] md:text-xs">PM2.5</div><div className="text-lg md:text-xl font-bold text-[var(--text-primary)]">{airNow?.pm25 ?? '—'}</div></div>
                  <div className="p-2 md:p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[var(--text-muted)] text-[10px] md:text-xs">PM10</div><div className="text-lg md:text-xl font-bold text-[var(--text-primary)]">{airNow?.pm10 ?? '—'}</div></div>
                  <div className="p-2 md:p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[var(--text-muted)] text-[10px] md:text-xs">O₃</div><div className="text-lg md:text-xl font-bold text-[var(--text-primary)]">{airNow?.o3 ?? '—'}</div></div>
                </div>
                <div className="mt-3 md:mt-4 text-[10px] md:text-xs text-[var(--text-muted)]">Données : Open‑Meteo Air Quality</div>
              </div>
            </div>
          )}

          {/* BULLETIN */}
          {activeTab === 'bulletin' && (
            <div>
              {loadingBulletin ? (
                <div className="w-8 h-8 border-2 border-[var(--border)] border-t-blue-400 rounded-full animate-spin mx-auto my-12" />
              ) : !bulletin ? (
                <div className="text-center text-[var(--text-muted)] my-12">
                  <Cloud className="w-12 h-12 mx-auto mb-3" />
                  Aucun bulletin météo disponible pour le moment
                </div>
              ) : (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
                  <div className="relative w-full aspect-video bg-[var(--surface-2)]">
                    <img src={bulletin.image_url} alt="Carte météo Alertemps" className="w-full h-full object-contain" />
                    <div className="absolute top-4 left-4">
                      <div className="px-3 py-1.5 bg-blue-500/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold inline-flex items-center gap-2">
                        <Cloud className="w-3.5 h-3.5" /> Alertemps
                      </div>
                    </div>
                  </div>
                  <div className="p-4 md:p-6">
                    {bulletin.title && (
                      <h2 className="text-lg md:text-2xl font-bold text-[var(--text-primary)] mb-2 md:mb-3">{bulletin.title}</h2>
                    )}
                    {bulletin.content && (
                      <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-3 md:mb-4 leading-relaxed whitespace-pre-wrap break-words">{bulletin.content}</p>
                    )}
                    <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-[var(--text-muted)] pt-3 md:pt-4 border-t border-[var(--border)]">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="break-words">
                          Publié le {new Date(bulletin.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Liens partenaires */}
                    <div className="mt-4 md:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                      <a href="https://www.youtube.com/@CIEUXINSTABLES" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-red-600/90 hover:bg-red-700 text-white transition-colors font-medium text-xs md:text-sm">
                        <span className="inline-flex items-center gap-1.5 md:gap-2"><Youtube className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> <span className="truncate">Chaîne YouTube Cieux Instables</span></span>
                        <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 opacity-90 flex-shrink-0" />
                      </a>

                      <a href="https://www.youtube.com/@alertemps" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-red-600/90 hover:bg-red-700 text-white transition-colors font-medium text-xs md:text-sm">
                        <span className="inline-flex items-center gap-1.5 md:gap-2"><Youtube className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> <span className="truncate">Chaîne YouTube Alertemps</span></span>
                        <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 opacity-90 flex-shrink-0" />
                      </a>

                      <a href="https://alertemps.wixsite.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-blue-600/90 hover:bg-blue-700 text-white transition-colors font-medium text-xs md:text-sm">
                        <span className="inline-flex items-center gap-1.5 md:gap-2"><Globe className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> <span className="truncate">Site web Alertemps</span></span>
                        <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 opacity-90 flex-shrink-0" />
                      </a>

                      <a href="https://www.instagram.com/alertemps_france/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-pink-500/90 to-purple-500/90 hover:from-pink-600 hover:to-purple-600 text-white transition-colors font-medium text-xs md:text-sm">
                        <span className="inline-flex items-center gap-1.5 md:gap-2"><Instagram className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> <span className="truncate">Instagram Alertemps</span></span>
                        <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 opacity-90 flex-shrink-0" />
                      </a>

                      <a href="https://www.facebook.com/p/Alertemps_france-100090219754668/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-blue-700/90 hover:bg-blue-800 text-white transition-colors font-medium text-xs md:text-sm sm:col-span-2">
                        <span className="inline-flex items-center gap-1.5 md:gap-2"><Facebook className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" /> <span className="truncate">Facebook Alertemps</span></span>
                        <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 opacity-90 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Note partenariat */}
              <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-[var(--text-secondary)]">
                    <p className="font-medium text-[var(--text-primary)] mb-1">Partenariat Alertemps - Cieux Instables</p>
                    <p>
                      Synaura s'associe à Alertemps pour vous proposer des bulletins météo actualisés.
                      Ces cartes sont réalisées par{' '}
                      <a href="https://www.youtube.com/@CIEUXINSTABLES" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-medium">Cieux Instables</a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {loadingWx && <div className="text-center text-xs text-[var(--text-muted)]">Mise à jour des données météo…</div>}
      </main>
    </div>
  );
}
