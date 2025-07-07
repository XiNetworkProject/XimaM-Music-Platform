'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LazyLoaderProps {
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
  placeholder?: ReactNode;
  className?: string;
}

export default function LazyLoader({ 
  children, 
  threshold = 0.1, 
  rootMargin = '50px',
  placeholder,
  className = ''
}: LazyLoaderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (isVisible) {
      // Simuler un délai minimal pour une transition fluide
      const timer = setTimeout(() => {
        setHasLoaded(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <div ref={ref} className={className}>
      <AnimatePresence mode="wait">
        {!hasLoaded && placeholder && (
          <motion.div
            key="placeholder"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {placeholder}
          </motion.div>
        )}
        
        {hasLoaded && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Composant spécialisé pour les images
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  fallback = '/default-cover.jpg',
  onLoad,
  onError
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (src) {
      setIsLoading(true);
      setHasError(false);
      
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoading(false);
        onLoad?.();
      };
      img.onerror = () => {
        setHasError(true);
        setIsLoading(false);
        onError?.();
      };
      img.src = src;
    }
  }, [src, onLoad, onError]);

  return (
    <LazyLoader
      placeholder={
        <div className={`${className} bg-gray-800 animate-pulse rounded-lg`}>
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg" />
        </div>
      }
    >
      <motion.img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'blur-sm' : 'blur-0'} transition-all duration-300`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        onLoad={() => setIsLoading(false)}
      />
    </LazyLoader>
  );
}

// Composant pour le contenu avec skeleton
interface LazyContentProps {
  children: ReactNode;
  skeleton?: ReactNode;
  className?: string;
}

export function LazyContent({ children, skeleton, className = '' }: LazyContentProps) {
  return (
    <LazyLoader
      placeholder={
        skeleton || (
          <div className={`${className} animate-pulse`}>
            <div className="h-4 bg-gray-700 rounded mb-2" />
            <div className="h-4 bg-gray-700 rounded mb-2 w-3/4" />
            <div className="h-4 bg-gray-700 rounded w-1/2" />
          </div>
        )
      }
      className={className}
    >
      {children}
    </LazyLoader>
  );
} 