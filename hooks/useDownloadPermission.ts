'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getEntitlements } from '@/lib/entitlements';

export interface DownloadPermission {
  canDownload: boolean;
  plan: string;
  upgradeMessage?: string;
}

export function useDownloadPermission(): DownloadPermission {
  const { data: session } = useSession();
  const [permission, setPermission] = useState<DownloadPermission>({
    canDownload: false,
    plan: 'free',
    upgradeMessage: 'Passez à Pro pour télécharger la musique'
  });

  useEffect(() => {
    const fetchPermission = async () => {
      if (!session?.user?.id) {
        // Utilisateur non connecté = Free
        setPermission({
          canDownload: false,
          plan: 'free',
          upgradeMessage: 'Connectez-vous et passez à Pro pour télécharger'
        });
        return;
      }

      try {
        const response = await fetch('/api/subscriptions/my-subscription', {
          headers: { 'Cache-Control': 'no-store' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const plan = (data.subscription?.name || 'free').toLowerCase();
          const entitlements = getEntitlements(plan as any);
          
          setPermission({
            canDownload: entitlements.features.download,
            plan: plan,
            upgradeMessage: entitlements.features.download 
              ? undefined 
              : 'Passez à Pro ou Enterprise pour télécharger la musique'
          });
        }
      } catch (error) {
        console.error('Erreur récupération permissions téléchargement:', error);
        // Fallback vers Free
        setPermission({
          canDownload: false,
          plan: 'free',
          upgradeMessage: 'Passez à Pro pour télécharger la musique'
        });
      }
    };

    fetchPermission();
  }, [session?.user?.id]);

  return permission;
}

// Fonction utilitaire pour télécharger un fichier audio
export async function downloadAudioFile(
  audioUrl: string, 
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    // Créer un élément <a> temporaire pour le téléchargement
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    link.target = '_blank';
    
    // Ajouter au DOM temporairement
    document.body.appendChild(link);
    link.click();
    
    // Nettoyer
    document.body.removeChild(link);
    
    // Simuler le progrès (car le téléchargement natif ne donne pas de callback)
    if (onProgress) {
      onProgress(0);
      setTimeout(() => onProgress(50), 100);
      setTimeout(() => onProgress(100), 200);
    }
    
  } catch (error) {
    console.error('Erreur téléchargement:', error);
    throw new Error('Impossible de télécharger le fichier');
  }
}

// Fonction pour générer un nom de fichier propre
export function generateFilename(trackTitle: string, artistName: string): string {
  const cleanTitle = trackTitle.replace(/[^\w\s-]/g, '').trim();
  const cleanArtist = artistName.replace(/[^\w\s-]/g, '').trim();
  return `${cleanArtist} - ${cleanTitle}.mp3`;
}
