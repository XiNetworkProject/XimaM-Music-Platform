// hooks/useServiceWorkerPolling.ts
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface PollingResult {
  taskId: string;
  status: string;
  tracks: any[];
  error?: string;
}

export function useServiceWorkerPolling() {
  const { data: session } = useSession();
  const [activeTasks, setActiveTasks] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, PollingResult>>(new Map());
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const swRef = useRef<ServiceWorker | null>(null);

  // Initialiser le service worker
  useEffect(() => {
    if (!session?.user?.id) return;

    const initServiceWorker = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw-polling.js');
          swRef.current = registration.active;
          
          // Attendre que le service worker soit prêt
          if (registration.active) {
            setIsServiceWorkerReady(true);
          } else {
            registration.addEventListener('activate', () => {
              swRef.current = registration.active;
              setIsServiceWorkerReady(true);
            });
          }

          // Écouter les messages du service worker
          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        }
      } catch (error) {
        console.error('Erreur initialisation service worker:', error);
      }
    };

    initServiceWorker();

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [session?.user?.id]);

  // Gérer les messages du service worker
  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, taskId, data } = event.data;

    if (type === 'POLLING_UPDATE') {
      const { status, tracks, error } = data;
      
      setResults(prev => new Map(prev.set(taskId, { taskId, status, tracks, error })));

      // Si la tâche est terminée, la retirer des tâches actives
      if (status === 'SUCCESS' || status === 'success' || status === 'ERROR' || status === 'error' || status === 'timeout') {
        setActiveTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });

        // Sauvegarder les tracks si succès
        if (status === 'SUCCESS' && tracks && tracks.length > 0) {
          saveTracksToDatabase(taskId, tracks);
        }
      }
    }
  };

  // Sauvegarder les tracks en base de données
  const saveTracksToDatabase = async (taskId: string, tracks: any[]) => {
    try {
      const response = await fetch('/api/suno/save-tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          tracks,
          status: 'completed'
        }),
      });

      if (response.ok) {
        console.log('✅ Tracks sauvegardées via service worker');
      } else {
        console.error('❌ Erreur sauvegarde tracks:', await response.text());
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde tracks:', error);
    }
  };

  // Démarrer le polling pour une tâche
  const startPolling = (taskId: string, config: any = {}) => {
    if (!isServiceWorkerReady || !swRef.current) {
      console.warn('Service worker non prêt, polling classique');
      return false;
    }

    if (activeTasks.has(taskId)) {
      console.warn(`Polling déjà en cours pour ${taskId}`);
      return false;
    }

    console.log(`🎵 Démarrage polling service worker pour ${taskId}`);
    
    setActiveTasks(prev => new Set(prev.add(taskId)));
    
    swRef.current.postMessage({
      type: 'START_POLLING',
      taskId,
      data: config
    });

    return true;
  };

  // Arrêter le polling pour une tâche
  const stopPolling = (taskId: string) => {
    if (!isServiceWorkerReady || !swRef.current) return;

    console.log(`🛑 Arrêt polling service worker pour ${taskId}`);
    
    setActiveTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });

    swRef.current.postMessage({
      type: 'STOP_POLLING',
      taskId
    });
  };

  // Obtenir le résultat d'une tâche
  const getResult = (taskId: string): PollingResult | undefined => {
    return results.get(taskId);
  };

  // Nettoyer les résultats anciens
  const cleanupResults = () => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    setResults(prev => {
      const newMap = new Map<string, PollingResult>();
      // Remplacer l'itération for...of par un spread compatible ES5
      const entries = Array.from(prev.entries());
      for (let i = 0; i < entries.length; i++) {
        const tuple = entries[i];
        const taskId = tuple[0];
        const result = tuple[1];
        if (result && (result.status === 'SUCCESS' || result.status === 'success')) {
          newMap.set(taskId, result);
        }
      }
      return newMap;
    });
  };

  // Nettoyer automatiquement toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(cleanupResults, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    startPolling,
    stopPolling,
    getResult,
    activeTasks,
    isServiceWorkerReady,
    cleanupResults
  };
}
