'use client';

import { useState, useEffect } from 'react';
import { Cloud, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface Bulletin {
  id: string;
  title?: string;
  image_url: string;
  created_at: string;
}

export default function MeteoWidget() {
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBulletin = async () => {
      try {
        const response = await fetch(`/api/meteo/public?source=widget&_ts=${Date.now()}` , { cache: 'no-store' });
        const data = await response.json();
        
        if (response.ok && data.bulletin) {
          setBulletin(data.bulletin);
        }
      } catch (error) {
        console.error('Erreur chargement bulletin météo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBulletin();
  }, []);

  if (loading || !bulletin) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => router.push('/meteo')}
      className="w-full bg-gradient-to-r from-blue-50/10 to-cyan-50/10 border border-blue-200/20 rounded-2xl overflow-hidden hover:border-blue-400/50 hover:from-blue-50/20 hover:to-cyan-50/20 transition-all group backdrop-blur-sm"
    >
      <div className="flex items-center gap-4 p-5">
        {/* Image météo format paysage */}
        <div className="w-32 h-20 bg-gradient-to-r from-blue-100/20 to-cyan-100/20 rounded-xl overflow-hidden flex-shrink-0 border border-blue-200/30">
          <img 
            src={bulletin.image_url}
            alt="Bulletin météo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Contenu */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-semibold text-blue-500 bg-blue-100/20 px-2 py-1 rounded-full">Alertemps</span>
          </div>
          
          <h3 className="text-base font-semibold text-[var(--text-primary)] line-clamp-1 mb-1">
            {bulletin.title || 'Bulletin météo'}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>Mis à jour {new Date(bulletin.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short'
            })}</span>
          </div>
        </div>

        {/* Flèche avec style météo */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100/20 group-hover:bg-blue-200/30 transition-colors">
          <ChevronRight className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
        </div>
      </div>
    </motion.button>
  );
}

