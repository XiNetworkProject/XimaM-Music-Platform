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
        console.log(`🎵 Synchronisation écoutes pour ${trackId}`);
        
        // Mise à jour optimiste immédiate
        updatePlays(trackId, 1, true);
        
        // Synchronisation avec le serveur
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
        })
        .catch(error => {
          console.error(`❌ Erreur synchronisation écoutes pour ${trackId}:`, error);
          // Rollback en cas d'erreur
          updatePlays(trackId, 0, false, 'Erreur de synchronisation');
        });
      }
    };

    // Écouter les événements de changement de piste
    const handleTrackChanged = (event: CustomEvent) => {
      const { trackId } = event.detail;
      if (trackId && session?.user?.id) {
        console.log(`🔄 Changement de piste détecté: ${trackId}`);
        
        // Incrémenter les écoutes pour la nouvelle piste
        updatePlays(trackId, 1, true);
        
        // Synchronisation avec le serveur
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
        })
        .catch(error => {
          console.error(`❌ Erreur mise à jour écoutes pour ${trackId}:`, error);
          updatePlays(trackId, 0, false, 'Erreur de mise à jour');
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
      window.dispatchEvent(new CustomEvent('trackPlayed', {
        detail: { trackId }
      }));
    }
  }, [session?.user?.id]);

  return {
    triggerPlaysSync
  };
} 