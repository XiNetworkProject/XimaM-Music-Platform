import { useEffect, useCallback } from 'react';
import { usePlaysContext } from '@/contexts/PlaysContext';
import { useSession } from 'next-auth/react';

export function usePlaysSync() {
  const { data: session } = useSession();
  const { updatePlays, syncPlays } = usePlaysContext();

  // Écouter les événements de lecture de pistes
  useEffect(() => {
    const handleTrackPlayed = (event: CustomEvent) => {
      const { trackId } = event.detail;
      if (trackId && session?.user?.id) {
        // Ne pas synchroniser les écoutes pour la radio uniquement
        if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam') {
          return;
        }
        
        console.log(`🎵 Synchronisation écoutes pour ${trackId}`);
        
        // Synchronisation avec le serveur (pas d'optimistic à 1)
        fetch(`/api/tracks/${trackId}/plays`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then(response => response.json())
        .then(data => {
          // Mise à jour avec les vraies données du serveur
          syncPlays(trackId, data.plays);
          console.log(`✅ Écoutes synchronisées pour ${trackId}: ${data.plays}`);
          // Broadcast global pour les composants qui écoutent
          window.dispatchEvent(new CustomEvent('playsUpdated', { detail: { trackId, plays: data.plays } }));
        })
        .catch(error => {
          console.error(`❌ Erreur synchronisation écoutes pour ${trackId}:`, error);
        });
      }
    };

    // Écouter les événements de changement de piste
    const handleTrackChanged = (event: CustomEvent) => {
      const { trackId } = event.detail;
      if (trackId && session?.user?.id) {
        // Ne pas synchroniser les écoutes pour la radio uniquement
        if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam') {
          return;
        }
        
        console.log(`🔄 Changement de piste détecté: ${trackId}`);
        // Synchronisation avec le serveur (pas d'optimistic à 1)
        fetch(`/api/tracks/${trackId}/plays`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .then(response => response.json())
        .then(data => {
          syncPlays(trackId, data.plays);
          console.log(`✅ Écoutes mises à jour pour ${trackId}: ${data.plays}`);
          window.dispatchEvent(new CustomEvent('playsUpdated', { detail: { trackId, plays: data.plays } }));
        })
        .catch(error => {
          console.error(`❌ Erreur mise à jour écoutes pour ${trackId}:`, error);
        });
      }
    };

    // Ajouter les listeners
    window.addEventListener('trackPlayed', handleTrackPlayed as EventListener);
    window.addEventListener('trackChanged', handleTrackChanged as EventListener);

    // Nettoyage
    return () => {
      window.removeEventListener('trackPlayed', handleTrackPlayed as EventListener);
      window.removeEventListener('trackChanged', handleTrackChanged as EventListener);
    };
  }, [session?.user?.id, updatePlays, syncPlays]);

  // Fonction pour déclencher manuellement une synchronisation
  const triggerPlaysSync = useCallback((trackId: string) => {
    if (trackId && session?.user?.id) {
      // Ne pas déclencher la synchronisation pour la radio uniquement
      if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam') {
        return;
      }
      
      window.dispatchEvent(new CustomEvent('trackPlayed', {
        detail: { trackId }
      }));
    }
  }, [session?.user?.id]);

  return {
    triggerPlaysSync
  };
} 