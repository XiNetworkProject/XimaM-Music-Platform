// hooks/useSunoWaiter.ts
import { useEffect, useRef, useState } from "react";
import { SunoRecordInfo } from "@/lib/suno";

export type WaiterState = "idle" | "pending" | "first" | "success" | "error";

export function useSunoWaiter(taskId?: string) {
  const [state, setState] = useState<WaiterState>("idle");
  const [tracks, setTracks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<any>(null);
  const pollCount = useRef<number>(0);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!taskId) {
      setState("idle");
      setTracks([]);
      setError(null);
      return;
    }

    setState("pending");
    setError(null);
    pollCount.current = 0;
    startTime.current = Date.now();

    // Poll toutes les 10–15s tant qu'on n'a pas SUCCESS/ERROR
    const poll = async () => {
      pollCount.current++;
      
      // Timeout de sécurité après 30 tentatives (5 minutes)
      if (pollCount.current > 30) {
        setState("error");
        setError("Timeout: Impossible de récupérer les tracks après 5 minutes");
        console.error("❌ Timeout polling après 30 tentatives");
        return;
      }
      try {
        console.log(`🔍 Polling Suno pour ${taskId}...`);
        
        const res = await fetch(`/api/suno/status?taskId=${encodeURIComponent(taskId)}`, { 
          cache: "no-store",
          credentials: 'include'
        });
        
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json?.error || "Polling failed");
        }

        const status = json.status as string;
        const tracks = json.tracks || [];
        
        console.log(`📊 Status Suno: ${status}`);
        console.log(`🎵 Tracks reçues:`, tracks);
        console.log(`🎵 Nombre de tracks:`, tracks.length);
        console.log(`🎵 JSON complet:`, json);
        
        // Vérifier si on a des URLs de streaming disponibles
        const hasStreamUrls = tracks.some((t: any) => t.stream || t.audio);
        console.log(`🔍 Has stream URLs: ${hasStreamUrls}`);
        if (tracks.length > 0) {
          tracks.forEach((t: any, i: number) => {
            console.log(`🎵 Track ${i}:`, {
              id: t.id,
              title: t.title,
              hasAudio: !!t.audio,
              hasStream: !!t.stream,
              audioUrl: t.audio?.substring(0, 50) + '...',
              streamUrl: t.stream?.substring(0, 50) + '...'
            });
          });
        }
        
        // Mettre à jour les tracks dès qu'on en a (streaming ou final)
        if (tracks.length > 0 && hasStreamUrls) {
          setTracks(tracks);
        }

        if (status === "FIRST_SUCCESS" || status === "first") {
          setState("first");
          console.log("🎵 Première piste terminée !");
          // Sauvegarder immédiatement les pistes disponibles (au moins 1)
          if (tracks && tracks.length > 0) {
            try {
              const response = await fetch('/api/suno/save-tracks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, tracks, status: 'partial' })
              });
              if (response.ok) {
                console.log('✅ Première piste sauvegardée');
                // Notifier l'UI pour rafraîchir la bibliothèque
                window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
              } else {
                console.error('❌ Erreur sauvegarde FIRST_SUCCESS:', await response.text());
              }
            } catch (e) {
              console.error('❌ Exception sauvegarde FIRST_SUCCESS:', e);
            }
          }
          // Continuer le polling pour la deuxième piste
          timer.current = setTimeout(poll, 5000);
          return;
        }
        
        if (status === "SUCCESS" || status === "success") { 
          // Vérifier si on a des tracks
          console.log("🎯 Statut SUCCESS détecté, vérification des tracks...");
          console.log("📊 Tracks disponibles:", tracks);
          console.log("📊 JSON complet:", json);
          
          if (tracks && tracks.length > 0) {
            // Sauvegarder les tracks en base de données
            try {
              const response = await fetch('/api/suno/save-tracks', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  taskId: taskId,
                  tracks: tracks,
                  status: 'completed'
                }),
              });
              
              if (response.ok) {
                console.log("✅ Tracks sauvegardées en base de données");
                // Notifier l'UI pour rafraîchir la bibliothèque
                window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
              } else {
                console.error("❌ Erreur sauvegarde tracks:", await response.text());
              }
            } catch (error) {
              console.error("❌ Erreur sauvegarde tracks:", error);
            }
            
            setState("success"); 
            console.log("✅ Génération terminée avec tracks !");
            return; 
          } else {
            console.log("⚠️ Statut SUCCESS mais tracks vides, continuer le polling...");
            // Continuer le polling pour récupérer les tracks
            timer.current = setTimeout(poll, 5000);
            return;
          }
        }
        
        if (status === "ERROR" || status === "error") {
          setState("error");
          setError(json.error || `Erreur: ${status}`);
          console.error("❌ Erreur Suno:", status, json.error);
          return;
        }

        // Polling intelligent avec délai adaptatif
        const elapsed = Date.now() - startTime.current;
        let delay = 12000; // Délai de base
        
        // Réduire la fréquence de polling au fil du temps
        if (elapsed > 180000) { // Après 3 minutes
          delay = 30000; // 30 secondes
        } else if (elapsed > 120000) { // Après 2 minutes
          delay = 20000; // 20 secondes
        } else if (elapsed > 60000) { // Après 1 minute
          delay = 15000; // 15 secondes
        }
        
        timer.current = setTimeout(poll, delay);
        
      } catch (err: any) {
        console.error("❌ Erreur polling:", err.message);
        setError(err.message);
        timer.current = setTimeout(poll, 15000);
      }
    };

    poll();
    
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [taskId]);

  return { state, tracks, error };
}
