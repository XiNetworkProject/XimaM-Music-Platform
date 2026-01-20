'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type TikTokMediaItem =
  | {
      id: string;
      type: 'track';
      title: string;
      subtitle?: string;
      coverUrl?: string | null;
    }
  | {
      id: string;
      type: 'image';
      title?: string;
      subtitle?: string;
      src: string;
    }
  | {
      id: string;
      type: 'video';
      title?: string;
      subtitle?: string;
      src: string;
      poster?: string;
    };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function TikTokStyleMediaScroller({
  items,
  heightOffsetPx = 0,
  onActiveIndexChange,
  onUserGesture,
  renderItem,
  activeIndex: controlledActiveIndex,
}: {
  items: TikTokMediaItem[];
  /** Hauteur à soustraire (navbar/player). */
  heightOffsetPx?: number;
  /** Callback quand l'item "actif" change (viewport). */
  onActiveIndexChange?: (index: number) => void;
  /** Déclenché au premier geste utilisateur sur le scroller (utile pour autoplay). */
  onUserGesture?: () => void;
  /** Rendu custom (si besoin). */
  renderItem?: (item: TikTokMediaItem, state: { isActive: boolean; index: number }) => React.ReactNode;
  /** Index actif contrôlé (optionnel). */
  activeIndex?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const hasGestureRef = useRef(false);

  const [uncontrolledActiveIndex, setUncontrolledActiveIndex] = useState(0);
  const activeIndex = controlledActiveIndex ?? uncontrolledActiveIndex;

  const viewportHeightStyle = useMemo(() => {
    const h = Math.max(320, Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) - heightOffsetPx));
    // On évite d’utiliser la valeur calculée “en dur” en SSR; on s’appuie sur CSS calc côté client.
    return { height: `calc(100svh - ${heightOffsetPx}px)` } as const;
  }, [heightOffsetPx]);

  // Observer: item "actif" = celui qui intersecte le plus (threshold 0.6)
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const els = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!els.length) return;

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        // choisir l'entrée la plus visible
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!best) return;

        const idx = els.findIndex((el) => el === best.target);
        if (idx < 0) return;

        // throttle via rAF
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          setUncontrolledActiveIndex((prev) => (prev === idx ? prev : idx));
          onActiveIndexChange?.(idx);
        });
      },
      { root, threshold: [0.25, 0.5, 0.6, 0.75, 0.9] }
    );

    els.forEach((el) => io.observe(el));
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [items.length, onActiveIndexChange]);

  // Si activeIndex contrôlé change, scroller vers l'item
  useEffect(() => {
    const root = containerRef.current;
    const el = itemRefs.current[activeIndex];
    if (!root || !el) return;
    // scrollIntoView dans le container
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeIndex]);

  const handleGesture = () => {
    if (hasGestureRef.current) return;
    hasGestureRef.current = true;
    onUserGesture?.();
  };

  const virtualWindow = useMemo(() => {
    // on rend en "plein" uniquement l'actif +/- 1, les autres sont des placeholders (snap points)
    const start = clamp(activeIndex - 1, 0, Math.max(0, items.length - 1));
    const end = clamp(activeIndex + 1, 0, Math.max(0, items.length - 1));
    return { start, end };
  }, [activeIndex, items.length]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handleGesture}
      onKeyDown={handleGesture}
      tabIndex={0}
      className="w-full overflow-y-auto overscroll-contain rounded-2xl border border-border-secondary bg-background-primary focus:outline-none"
      style={{
        ...viewportHeightStyle,
        scrollSnapType: 'y mandatory',
      }}
    >
      {items.map((item, i) => {
        const isActive = i === activeIndex;
        const inWindow = i >= virtualWindow.start && i <= virtualWindow.end;

        return (
          <div
            key={item.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="relative w-full"
            style={{
              height: `calc(100svh - ${heightOffsetPx}px)`,
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
            }}
          >
            {!inWindow ? (
              <div className="absolute inset-0" />
            ) : renderItem ? (
              <div className="absolute inset-0">{renderItem(item, { isActive, index: i })}</div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-foreground-inactive text-sm">Item {i + 1}</div>
              </div>
            )}

            {/* mini marqueur debug (discret) */}
            <div className="absolute bottom-3 left-3 text-[11px] text-white/60">
              {isActive ? 'ACTIVE' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

