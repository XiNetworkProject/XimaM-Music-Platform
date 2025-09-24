'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Announcement = {
  id: string;
  title: string;
  body?: string | null;
  image_url?: string | null;
};

export default function AnnouncementsCarousel() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/announcements', { headers: { 'Cache-Control': 'no-store' } });
        if (res.ok) {
          const json = await res.json();
          setItems(json.items || []);
        }
      } catch {}
    };
    load();
  }, []);

  // Auto-rotate toutes les 5s
  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5000);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[index];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl panel-suno border border-[var(--border)]">
      {/* Image de fond */}
      {current.image_url && (
        <div className="absolute inset-0">
          <img src={current.image_url} alt={current.title} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/20" />
        </div>
      )}

      {/* Contenu */}
      <div className="relative z-10 p-5 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="max-w-3xl"
          >
            <h3 className="text-2xl sm:text-3xl font-bold text-white title-suno">{current.title}</h3>
            {current.body && (
              <p className="mt-2 text-white/80 text-sm sm:text-base leading-relaxed">{current.body}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Indicateurs */}
        {items.length > 1 && (
          <div className="mt-4 flex gap-1.5">
            {items.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-3 bg-white/40'}`}
              />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

