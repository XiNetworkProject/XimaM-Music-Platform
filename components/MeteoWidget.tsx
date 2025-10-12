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
        const response = await fetch('/api/meteo/public');
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
      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-blue-400/50 transition-all group"
    >
      <div className="flex items-center gap-4 p-4">
        {/* Miniature */}
        <div className="w-20 h-20 bg-[var(--surface-2)] rounded-xl overflow-hidden flex-shrink-0">
          <img 
            src={bulletin.image_url}
            alt="Météo"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Contenu */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <Cloud className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400">Alertemps</span>
          </div>
          
          <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">
            {bulletin.title || 'Bulletin météo'}
          </h3>
          
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Mis à jour {new Date(bulletin.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short'
            })}
          </p>
        </div>

        {/* Flèche */}
        <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-blue-400 transition-colors flex-shrink-0" />
      </div>
    </motion.button>
  );
}

