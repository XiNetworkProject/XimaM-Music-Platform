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
    // Simuler le progrès initial
    if (onProgress) {
      onProgress(10);
    }

    // Fetch le fichier audio
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    if (onProgress) {
      onProgress(30);
    }

    // Convertir en blob
    const blob = await response.blob();
    
    if (onProgress) {
      onProgress(70);
    }

    // Créer l'URL du blob
    const blobUrl = URL.createObjectURL(blob);
    
    if (onProgress) {
      onProgress(90);
    }

    // Créer un élément <a> temporaire pour le téléchargement
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    
    // Ajouter au DOM temporairement
    document.body.appendChild(link);
    link.click();
    
    // Nettoyer
    document.body.removeChild(link);
    
    // Libérer l'URL du blob après un délai
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
    
    if (onProgress) {
      onProgress(100);
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
