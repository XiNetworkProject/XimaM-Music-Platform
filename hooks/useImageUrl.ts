import { useMemo } from 'react';

export const useImageUrl = (url: string | undefined, defaultImage: string) => {
  return useMemo(() => {
    if (!url) return defaultImage;
    
    // Si c'est une URL localhost, la convertir en chemin relatif
    if (url.includes('localhost:3000')) {
      const path = url.replace(/^https?:\/\/localhost:3000/, '');
      return path || defaultImage;
    }
    
    // Si c'est une URL complète (http/https), l'utiliser directement
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Si c'est une URL relative, la préfixer avec le domaine
    if (url.startsWith('/')) {
      if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin;
        return `${baseUrl}${url}`;
      }
      return url; // Fallback pour SSR
    }
    
    // Sinon, utiliser l'image par défaut
    return defaultImage;
  }, [url, defaultImage]);
};

// Fonction utilitaire pour usage direct (sans hook)
export const getImageUrl = (url: string | undefined, defaultImage: string): string => {
  if (!url) return defaultImage;
  
  // Si c'est une URL localhost, la convertir en chemin relatif
  if (url.includes('localhost:3000')) {
    const path = url.replace(/^https?:\/\/localhost:3000/, '');
    return path || defaultImage;
  }
  
  // Si c'est une URL complète (http/https), l'utiliser directement
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Si c'est une URL relative, la préfixer avec le domaine
  if (url.startsWith('/')) {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}${url}`;
    }
    return url; // Fallback pour SSR
  }
  
  // Sinon, utiliser l'image par défaut
  return defaultImage;
}; 