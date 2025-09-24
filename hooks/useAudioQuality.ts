'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getEntitlements } from '@/lib/entitlements';

export interface AudioQualityInfo {
  maxQualityKbps: number;
  qualityLabel: string;
  qualityColor: string;
  isUpgradeable: boolean;
  upgradeMessage?: string;
}

export function useAudioQuality(): AudioQualityInfo {
  const { data: session } = useSession();
  const [qualityInfo, setQualityInfo] = useState<AudioQualityInfo>({
    maxQualityKbps: 128,
    qualityLabel: 'Standard',
    qualityColor: 'text-gray-400',
    isUpgradeable: true,
    upgradeMessage: 'Passez à Starter pour la haute qualité'
  });

  useEffect(() => {
    const fetchQuality = async () => {
      if (!session?.user?.id) {
        // Utilisateur non connecté = Free
        setQualityInfo({
          maxQualityKbps: 128,
          qualityLabel: 'Standard',
          qualityColor: 'text-gray-400',
          isUpgradeable: true,
          upgradeMessage: 'Connectez-vous pour accéder à la haute qualité'
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
          
          const qualityKbps = entitlements.audio.maxQualityKbps;
          let qualityLabel = '';
          let qualityColor = '';
          let isUpgradeable = false;
          let upgradeMessage = '';

          switch (qualityKbps) {
            case 128:
              qualityLabel = 'Standard';
              qualityColor = 'text-gray-400';
              isUpgradeable = true;
              upgradeMessage = 'Passez à Starter pour la haute qualité (256 kbps)';
              break;
            case 256:
              qualityLabel = 'Haute qualité';
              qualityColor = 'text-blue-400';
              isUpgradeable = true;
              upgradeMessage = 'Passez à Pro pour la qualité maximale (320 kbps)';
              break;
            case 320:
              qualityLabel = 'Qualité maximale';
              qualityColor = 'text-purple-400';
              isUpgradeable = false;
              break;
            default:
              qualityLabel = 'Standard';
              qualityColor = 'text-gray-400';
              isUpgradeable = true;
              upgradeMessage = 'Passez à Starter pour la haute qualité';
          }

          setQualityInfo({
            maxQualityKbps: qualityKbps,
            qualityLabel,
            qualityColor,
            isUpgradeable,
            upgradeMessage
          });
        }
      } catch (error) {
        console.error('Erreur récupération qualité audio:', error);
        // Fallback vers Free
        setQualityInfo({
          maxQualityKbps: 128,
          qualityLabel: 'Standard',
          qualityColor: 'text-gray-400',
          isUpgradeable: true,
          upgradeMessage: 'Passez à Starter pour la haute qualité'
        });
      }
    };

    fetchQuality();
  }, [session?.user?.id]);

  return qualityInfo;
}

// Fonction utilitaire pour obtenir l'URL audio avec la bonne qualité
export function getAudioUrlWithQuality(originalUrl: string, qualityKbps: number): string {
  if (!originalUrl) return originalUrl;
  
  // Si c'est une URL Cloudinary, on peut ajouter des paramètres de qualité
  if (originalUrl.includes('cloudinary.com')) {
    const qualityParam = qualityKbps === 128 ? 'q_auto:low' : 
                        qualityKbps === 256 ? 'q_auto:good' : 
                        'q_auto:best';
    
    // Ajouter le paramètre de qualité à l'URL Cloudinary
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}${qualityParam}`;
  }
  
  // Pour les autres URLs, retourner l'URL originale
  return originalUrl;
}
