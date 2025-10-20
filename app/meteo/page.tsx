'use client';

import { useState, useEffect } from 'react';
import { Cloud, Calendar, AlertCircle, ExternalLink, Youtube, Instagram, Facebook, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface Bulletin {
  id: string;
  title?: string;
  content?: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export default function MeteoPublicPage() {
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBulletin = async () => {
      try {
        const response = await fetch(`/api/meteo/public?_ts=${Date.now()}` , { cache: 'no-store' });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!bulletin) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="text-center">
          <Cloud className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Aucun bulletin météo disponible pour le moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24 lg:pb-8">
      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pt-8">
        {/* Carte bulletin */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xl"
        >
          {/* Image météo */}
          <div className="relative w-full aspect-video bg-[var(--surface-2)]">
            <img 
              src={bulletin.image_url}
              alt="Carte météo Alertemps"
              className="w-full h-full object-contain"
            />
            
            {/* Badge Alertemps */}
            <div className="absolute top-4 left-4">
              <div className="px-3 py-1.5 bg-blue-500/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5" />
                Alertemps
              </div>
            </div>
          </div>

          {/* Infos */}
          <div className="p-6">
            {bulletin.title && (
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                {bulletin.title}
              </h2>
            )}
            
            {bulletin.content && (
              <p className="text-[var(--text-secondary)] mb-4 leading-relaxed whitespace-pre-wrap break-words">
                {bulletin.content}
              </p>
            )}

            {/* Métadonnées */}
            <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Publié le {new Date(bulletin.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Liens partenaires */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://www.youtube.com/@CIEUXINSTABLES"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-700 text-white transition-colors font-medium"
              >
                <span className="inline-flex items-center gap-2"><Youtube className="w-4 h-4" /> Chaîne YouTube Cieux Instables</span>
                <ExternalLink className="w-4 h-4 opacity-90" />
              </a>

              <a
                href="https://www.youtube.com/@alertemps"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-700 text-white transition-colors font-medium"
              >
                <span className="inline-flex items-center gap-2"><Youtube className="w-4 h-4" /> Chaîne YouTube Alertemps</span>
                <ExternalLink className="w-4 h-4 opacity-90" />
              </a>

              <a
                href="https://alertemps.wixsite.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-blue-600/90 hover:bg-blue-700 text-white transition-colors font-medium"
              >
                <span className="inline-flex items-center gap-2"><Globe className="w-4 h-4" /> Site web Alertemps</span>
                <ExternalLink className="w-4 h-4 opacity-90" />
              </a>

              <a
                href="https://www.instagram.com/alertemps_france/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500/90 to-purple-500/90 hover:from-pink-600 hover:to-purple-600 text-white transition-colors font-medium"
              >
                <span className="inline-flex items-center gap-2"><Instagram className="w-4 h-4" /> Instagram Alertemps</span>
                <ExternalLink className="w-4 h-4 opacity-90" />
              </a>

              <a
                href="https://www.facebook.com/p/Alertemps_france-100090219754668/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-blue-700/90 hover:bg-blue-800 text-white transition-colors font-medium sm:col-span-2"
              >
                <span className="inline-flex items-center gap-2"><Facebook className="w-4 h-4" /> Facebook Alertemps</span>
                <ExternalLink className="w-4 h-4 opacity-90" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Note partenariat */}
        <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)] mb-1">Partenariat Alertemps - Cieux Instables</p>
              <p>
                Synaura s'associe à Alertemps pour vous proposer des bulletins météo actualisés. 
                Ces cartes sont réalisées par{' '}
                <a 
                  href="https://www.youtube.com/@CIEUXINSTABLES" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  Cieux Instables
                </a>
                , une chaîne YouTube spécialisée en météorologie.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

