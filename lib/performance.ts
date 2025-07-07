// Configuration des optimisations de performance pour XimaM

export const PERFORMANCE_CONFIG = {
  // Cache
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  CACHE_CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB

  // Navigation
  PRELOAD_DISTANCE: 2, // Nombre de pages à précharger
  NAVIGATION_DEBOUNCE: 100, // ms

  // Animations
  ANIMATION_DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500
  },
  ANIMATION_EASING: [0.4, 0, 0.2, 1] as const,

  // Lazy Loading
  LAZY_LOAD_THRESHOLD: 0.1,
  LAZY_LOAD_ROOT_MARGIN: '50px',
  LAZY_LOAD_DELAY: 100, // ms

  // Scroll
  SCROLL_DEBOUNCE: 16, // ~60fps
  SCROLL_THRESHOLD: 100, // px
  VIRTUALIZATION_ITEM_HEIGHT: 100, // px

  // Images
  IMAGE_QUALITY: {
    THUMBNAIL: 0.6,
    MEDIUM: 0.8,
    HIGH: 1.0
  },
  IMAGE_SIZES: {
    THUMBNAIL: 150,
    MEDIUM: 300,
    LARGE: 600
  },

  // Audio
  AUDIO_PRELOAD: 'metadata' as const,
  AUDIO_BUFFER_SIZE: 10 * 1024 * 1024, // 10MB

  // API
  API_TIMEOUT: 10000, // 10s
  API_RETRY_COUNT: 2,
  API_RETRY_DELAY: 1000, // 1s

  // Service Worker
  SW_CACHE_VERSION: 'v4',
  SW_UPDATE_CHECK_INTERVAL: 60 * 60 * 1000, // 1 heure

  // Responsive
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1280
  },

  // Performance monitoring
  PERFORMANCE_MARKERS: {
    NAVIGATION_START: 'navigation-start',
    NAVIGATION_END: 'navigation-end',
    DATA_LOAD_START: 'data-load-start',
    DATA_LOAD_END: 'data-load-end',
    RENDER_START: 'render-start',
    RENDER_END: 'render-end'
  }
};

// Fonctions utilitaires pour les optimisations

export const performanceUtils = {
  // Mesurer les performances
  measure: (name: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
    return end - start;
  },

  // Mesurer les performances asynchrones
  measureAsync: async (name: string, fn: () => Promise<void>) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
    return end - start;
  },

  // Marquer les performances
  mark: (name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },

  // Mesurer entre deux marques
  measureBetween: (startMark: string, endMark: string, name: string) => {
    if (typeof performance !== 'undefined' && performance.measure) {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      console.log(`📊 ${name}: ${measure.duration.toFixed(2)}ms`);
      return measure.duration;
    }
    return 0;
  },

  // Debounce
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Vérifier si l'appareil est lent
  isSlowDevice: () => {
    if (typeof navigator !== 'undefined') {
      const connection = (navigator as any).connection;
      if (connection) {
        return connection.effectiveType === 'slow-2g' || 
               connection.effectiveType === '2g' ||
               connection.saveData;
      }
    }
    return false;
  },

  // Vérifier si on est en mode économie d'énergie
  isLowPowerMode: () => {
    if (typeof navigator !== 'undefined') {
      const connection = (navigator as any).connection;
      if (connection) {
        return connection.saveData;
      }
    }
    return false;
  },

  // Optimiser les images selon l'appareil
  getOptimizedImageUrl: (url: string, size: 'THUMBNAIL' | 'MEDIUM' | 'LARGE') => {
    if (!url) return url;
    
    // Si c'est une image Cloudinary, optimiser
    if (url.includes('res.cloudinary.com')) {
      const quality = PERFORMANCE_CONFIG.IMAGE_QUALITY[size === 'LARGE' ? 'HIGH' : size];
      const width = PERFORMANCE_CONFIG.IMAGE_SIZES[size];
      
      // Ajouter les paramètres d'optimisation
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}q=${quality}&w=${width}&f=auto`;
    }
    
    return url;
  },

  // Précharger les ressources
  preloadResource: (url: string, type: 'image' | 'script' | 'style' | 'fetch') => {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    link.crossOrigin = 'anonymous';
    
    document.head.appendChild(link);
  },

  // Nettoyer les ressources préchargées
  cleanupPreloadedResources: () => {
    if (typeof document === 'undefined') return;

    const preloadLinks = document.querySelectorAll('link[rel="preload"]');
    preloadLinks.forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
  }
};

// Configuration pour les animations optimisées
export const animationConfig = {
  // Animations rapides pour les interactions
  fast: {
    duration: PERFORMANCE_CONFIG.ANIMATION_DURATION.FAST,
    ease: PERFORMANCE_CONFIG.ANIMATION_EASING
  },

  // Animations normales pour les transitions
  normal: {
    duration: PERFORMANCE_CONFIG.ANIMATION_DURATION.NORMAL,
    ease: PERFORMANCE_CONFIG.ANIMATION_EASING
  },

  // Animations lentes pour les effets spéciaux
  slow: {
    duration: PERFORMANCE_CONFIG.ANIMATION_DURATION.SLOW,
    ease: PERFORMANCE_CONFIG.ANIMATION_EASING
  },

  // Animations optimisées pour les appareils lents
  optimized: {
    duration: performanceUtils.isSlowDevice() ? 100 : PERFORMANCE_CONFIG.ANIMATION_DURATION.NORMAL,
    ease: PERFORMANCE_CONFIG.ANIMATION_EASING
  }
};

// Configuration pour le cache intelligent
export const cacheConfig = {
  // Stratégies de cache
  strategies: {
    STATIC: 'cache-first',
    DYNAMIC: 'network-first',
    API: 'stale-while-revalidate',
    AUDIO: 'cache-first'
  },

  // Durées de cache par type
  durations: {
    STATIC: 24 * 60 * 60 * 1000, // 24h
    DYNAMIC: 5 * 60 * 1000, // 5min
    API: 2 * 60 * 1000, // 2min
    AUDIO: 60 * 60 * 1000 // 1h
  }
}; 