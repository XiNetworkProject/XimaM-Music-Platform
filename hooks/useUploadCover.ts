// hooks/useUploadCover.ts
import { useState, useEffect, useRef } from 'react';

export type CoverTrack = {
  id: string;
  audio?: string;
  stream?: string;
  image?: string;
  title?: string;
  duration?: number;
  raw?: any;
};

type CoverState = "idle" | "uploading" | "generating" | "success" | "error";

export function useUploadCover(taskId?: string) {
  const [state, setState] = useState<CoverState>("idle");
  const [tracks, setTracks] = useState<CoverTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const timer = useRef<NodeJS.Timeout | null>(null);
  const pollCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!taskId) {
      setState("idle");
      setTracks([]);
      setError(null);
      pollCount.current = 0;
      return;
    }

    setState("generating");
    setError(null);
    setTracks([]);
    pollCount.current = 0;
    startTime.current = Date.now();

    // Polling pour vérifier le statut
    const poll = async () => {
      pollCount.current++;
      
      // Timeout de sécurité après 60 tentatives (10 minutes)
      if (pollCount.current > 60) {
        setState("error");
        setError("Timeout : la génération a pris trop de temps");
        return;
      }

      try {
        // Pour les covers, utiliser l'endpoint de callback local
        const apiUrl = `/api/suno/check-status?taskId=${taskId}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const status = json?.data?.status?.toLowerCase();
        const tracksData = json?.data?.tracks || [];

        console.log(`🔄 Poll #${pollCount.current} - Statut:`, status, "Tracks:", tracksData.length);

        // Si erreur
        if (status === "error") {
          setState("error");
          setError(json.data.error || "Erreur lors de la génération du cover/remix");
          return;
        }

        // Si succès avec tracks
        if (status === "success" && tracksData.length > 0) {
          try {
            // Sauvegarder les tracks
            const saveResponse = await fetch('/api/suno/save-tracks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskId: taskId,
                tracks: tracksData,
                status: 'completed'
              }),
            });
            
            if (saveResponse.ok) {
              console.log("✅ Cover/Remix sauvegardé en base de données");
              window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
            } else {
              console.error("❌ Erreur sauvegarde cover:", await saveResponse.text());
            }
          } catch (error) {
            console.error("❌ Erreur sauvegarde cover:", error);
          }
          
          setTracks(tracksData);
          setState("success");
          console.log("✅ Cover/Remix terminé !");
          return;
        }

        // Continuer le polling
        const elapsed = Date.now() - startTime.current;
        let delay = 10000; // 10s par défaut
        
        // Délai adaptatif
        if (elapsed < 60000) delay = 5000;      // 5s pour la première minute
        else if (elapsed < 180000) delay = 10000; // 10s pour les 3 premières minutes
        else delay = 15000;                       // 15s après 3 minutes

        timer.current = setTimeout(poll, delay);
      } catch (err: any) {
        console.error("❌ Erreur polling:", err);
        setState("error");
        setError(err.message || "Erreur réseau");
      }
    };

    // Démarrer le polling
    poll();

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [taskId]);

  return { state, tracks, error, uploadProgress, setUploadProgress };
}

