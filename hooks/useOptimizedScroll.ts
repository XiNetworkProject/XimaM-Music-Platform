import { useState, useEffect, useRef, useCallback } from 'react';

interface UseOptimizedScrollOptions {
  threshold?: number;
  debounceMs?: number;
  enableVirtualization?: boolean;
  itemHeight?: number;
  containerHeight?: number;
}

export const useOptimizedScroll = (options: UseOptimizedScrollOptions = {}) => {
  const {
    threshold = 100,
    debounceMs = 16, // ~60fps
    enableVirtualization = false,
    itemHeight = 100,
    containerHeight = 400
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [isNearTop, setIsNearTop] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const rafRef = useRef<number>();

  // Fonction de debounce pour optimiser les performances
  const debouncedSetScrollTop = useCallback((value: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setScrollTop(value);
    }, debounceMs);
  }, [debounceMs]);

  // Gestionnaire de scroll optimisé avec requestAnimationFrame
  const handleScroll = useCallback((event: Event) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const target = event.target as HTMLElement;
      const newScrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;

      debouncedSetScrollTop(newScrollTop);

      // Vérifier si on est près du bas
      const nearBottom = scrollHeight - newScrollTop - clientHeight < threshold;
      setIsNearBottom(nearBottom);

      // Vérifier si on est près du haut
      const nearTop = newScrollTop < threshold;
      setIsNearTop(nearTop);

      // Calculer la plage visible pour la virtualisation
      if (enableVirtualization) {
        const start = Math.floor(newScrollTop / itemHeight);
        const end = Math.min(
          start + Math.ceil(clientHeight / itemHeight) + 1,
          Math.floor(scrollHeight / itemHeight)
        );
        setVisibleRange({ start, end });
      }
    });
  }, [threshold, debounceMs, enableVirtualization, itemHeight]);

  // Scroll vers le haut
  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior
      });
    }
  }, []);

  // Scroll vers le bas
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior
      });
    }
  }, []);

  // Scroll vers un élément spécifique
  const scrollToElement = useCallback((element: HTMLElement, behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset = elementRect.top - containerRect.top + containerRef.current.scrollTop;

      containerRef.current.scrollTo({
        top: offset,
        behavior
      });
    }
  }, []);

  // Scroll vers une position spécifique
  const scrollToPosition = useCallback((position: number, behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: position,
        behavior
      });
    }
  }, []);

  // Attacher le gestionnaire de scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleScroll]);

  // Fonction pour obtenir les éléments visibles (virtualisation)
  const getVisibleItems = useCallback((items: any[]) => {
    if (!enableVirtualization) return items;

    const { start, end } = visibleRange;
    return items.slice(start, end + 1).map((item, index) => ({
      ...item,
      virtualIndex: start + index,
      style: {
        position: 'absolute' as const,
        top: (start + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }));
  }, [enableVirtualization, visibleRange, itemHeight]);

  // Fonction pour calculer la hauteur totale (virtualisation)
  const getTotalHeight = useCallback((itemCount: number) => {
    if (!enableVirtualization) return 'auto';
    return itemCount * itemHeight;
  }, [enableVirtualization, itemHeight]);

  return {
    scrollTop,
    isNearBottom,
    isNearTop,
    visibleRange,
    containerRef,
    scrollToTop,
    scrollToBottom,
    scrollToElement,
    scrollToPosition,
    getVisibleItems,
    getTotalHeight
  };
}; 