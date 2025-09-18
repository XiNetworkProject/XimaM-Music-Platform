// hooks/useBackgroundGeneration.ts
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface BackgroundGeneration {
  id: string;
  taskId: string;
  status: 'pending' | 'completed' | 'failed';
  title: string;
  style: string;
  prompt: string;
  progress: number;
  startTime: number;
  estimatedTime: number;
}

export function useBackgroundGeneration() {
  const { data: session } = useSession();
  const [generations, setGenerations] = useState<BackgroundGeneration[]>([]);
  const [activeGenerations, setActiveGenerations] = useState<Set<string>>(new Set());
  const pollingRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Récupérer les générations en cours depuis le localStorage
  useEffect(() => {
    if (!session?.user?.id) return;

    const storedGenerations = localStorage.getItem(`bg_generations_${session.user.id}`);
    if (storedGenerations) {
      try {
        const parsed = JSON.parse(storedGenerations);
        setGenerations(parsed);
        
        // Identifier les générations actives
        const active = new Set<string>(
          parsed
            .filter((g: BackgroundGeneration) => g.status === 'pending')
            .map((g: BackgroundGeneration) => g.taskId)
        );
        setActiveGenerations(active);
      } catch (error) {
        console.error('Erreur parsing générations stockées:', error);
      }
    }
  }, [session?.user?.id]);

  // Sauvegarder les générations dans le localStorage
  const saveGenerations = (newGenerations: BackgroundGeneration[]) => {
    if (!session?.user?.id) return;
    
    setGenerations(newGenerations);
    localStorage.setItem(`bg_generations_${session.user.id}`, JSON.stringify(newGenerations));
  };

  // Démarrer une nouvelle génération en arrière-plan
  const startBackgroundGeneration = (generation: BackgroundGeneration) => {
    const newGenerations = [...generations, generation];
    saveGenerations(newGenerations);
    
    // Démarrer le polling pour cette génération
    startPolling(generation.taskId);
  };

  // Démarrer le polling pour une génération
  const startPolling = (taskId: string) => {
    if (pollingRefs.current.has(taskId)) return;

    const poll = async () => {
      try {
        const response = await fetch(`/api/suno/status?taskId=${encodeURIComponent(taskId)}`, {
          cache: "no-store",
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Erreur polling');
        }

        const data = await response.json();
        const status = data.status as string;

        // Mettre à jour la génération
        setGenerations(prev => prev.map(g => {
          if (g.taskId === taskId) {
            const progress = calculateProgress(g.startTime, g.estimatedTime);
            
            if (status === 'SUCCESS' || status === 'success') {
              // Génération terminée
              setActiveGenerations(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
              });
              
              // Arrêter le polling
              const timeout = pollingRefs.current.get(taskId);
              if (timeout) {
                clearTimeout(timeout);
                pollingRefs.current.delete(taskId);
              }
              
              return {
                ...g,
                status: 'completed',
                progress: 100
              };
            } else if (status === 'ERROR' || status === 'error') {
              // Erreur
              setActiveGenerations(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
              });
              
              const timeout = pollingRefs.current.get(taskId);
              if (timeout) {
                clearTimeout(timeout);
                pollingRefs.current.delete(taskId);
              }
              
              return {
                ...g,
                status: 'failed',
                progress: 0
              };
            } else {
              // En cours
              return {
                ...g,
                progress
              };
            }
          }
          return g;
        }));

        // Continuer le polling si pas terminé avec délai adaptatif
        if (status !== 'SUCCESS' && status !== 'success' && status !== 'ERROR' && status !== 'error') {
          // Trouver la génération pour calculer le délai adaptatif
          const generation = generations.find(g => g.taskId === taskId);
          const elapsed = generation ? Date.now() - generation.startTime : 0;
          let delay = 5000; // Délai de base
          
          // Délai adaptatif basé sur le temps écoulé
          if (elapsed > 120000) { // Après 2 minutes
            delay = 30000; // 30 secondes
          } else if (elapsed > 60000) { // Après 1 minute
            delay = 15000; // 15 secondes
          } else if (elapsed > 30000) { // Après 30 secondes
            delay = 10000; // 10 secondes
          }
          
          const timeout = setTimeout(poll, delay);
          pollingRefs.current.set(taskId, timeout);
        }

      } catch (error) {
        console.error('Erreur polling génération:', error);
        
        // Réessayer après un délai
        const timeout = setTimeout(poll, 10000);
        pollingRefs.current.set(taskId, timeout);
      }
    };

    // Démarrer le premier polling
    poll();
  };

  // Calculer le progrès basé sur le temps écoulé
  const calculateProgress = (startTime: number, estimatedTime: number): number => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / estimatedTime) * 100, 95); // Max 95% jusqu'à confirmation
    return Math.max(0, progress);
  };

  // Nettoyer les générations terminées
  const cleanupCompletedGenerations = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 heures
    
    setGenerations(prev => {
      const filtered = prev.filter(g => {
        // Garder les générations en cours
        if (g.status === 'pending') return true;
        
        // Supprimer les générations terminées depuis plus d'un jour
        if (now - g.startTime > oneDay) return false;
        
        return true;
      });
      
      saveGenerations(filtered);
      return filtered;
    });
  };

  // Nettoyer les générations anciennes toutes les heures
  useEffect(() => {
    const interval = setInterval(cleanupCompletedGenerations, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Nettoyer les timeouts à la destruction
  useEffect(() => {
    return () => {
      pollingRefs.current.forEach(timeout => clearTimeout(timeout));
      pollingRefs.current.clear();
    };
  }, []);

  return {
    generations,
    activeGenerations,
    startBackgroundGeneration,
    cleanupCompletedGenerations
  };
}
