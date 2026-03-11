'use client';

import { useState, useEffect } from 'react';
import { Cloud, ChevronRight, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface Bulletin {
  id: string;
  title?: string;
  image_url: string;
  created_at: string;
  category?: string;
}

interface MeteoAlert {
  id: string;
  title: string;
  severity: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-sky-500/20 border-sky-400/30 text-sky-300',
  warning: 'bg-amber-500/20 border-amber-400/30 text-amber-300',
  danger: 'bg-orange-500/20 border-orange-400/30 text-orange-300',
  critical: 'bg-red-500/20 border-red-400/30 text-red-300',
};

export default function MeteoWidget() {
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [alerts, setAlerts] = useState<MeteoAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bulletinRes, alertsRes] = await Promise.all([
          fetch(`/api/meteo/public?source=widget&_ts=${Date.now()}`, { cache: 'no-store' }),
          fetch('/api/meteo/alerts/active'),
        ]);

        if (bulletinRes.ok) {
          const data = await bulletinRes.json();
          if (data.bulletin) setBulletin(data.bulletin);
        }

        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts((data.alerts || []).slice(0, 2));
        }
      } catch {} finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || (!bulletin && alerts.length === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {/* Active alerts */}
      {alerts.map((alert) => (
        <button
          key={alert.id}
          onClick={() => router.push('/meteo')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all hover:opacity-80 ${SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.info}`}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate font-medium">{alert.title}</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0 ml-auto" />
        </button>
      ))}

      {/* Bulletin widget */}
      {bulletin && (
        <button
          onClick={() => router.push('/meteo')}
          className="w-full bg-gradient-to-r from-blue-50/10 to-cyan-50/10 border border-blue-200/20 rounded-2xl overflow-hidden hover:border-blue-400/50 hover:from-blue-50/20 hover:to-cyan-50/20 transition-all group backdrop-blur-sm"
        >
          <div className="flex items-center gap-4 p-5">
            <div className="w-32 h-20 bg-gradient-to-r from-blue-100/20 to-cyan-100/20 rounded-xl overflow-hidden flex-shrink-0 border border-blue-200/30">
              <img
                src={bulletin.image_url}
                alt="Bulletin meteo"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-semibold text-blue-500 bg-blue-100/20 px-2 py-1 rounded-full">Alertemps</span>
              </div>

              <h3 className="text-base font-semibold text-[var(--text-primary)] line-clamp-1 mb-1">
                {bulletin.title || 'Bulletin meteo'}
              </h3>

              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <span>Mis a jour {new Date(bulletin.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              </div>
            </div>

            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100/20 group-hover:bg-blue-200/30 transition-colors">
              <ChevronRight className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        </button>
      )}
    </motion.div>
  );
}
