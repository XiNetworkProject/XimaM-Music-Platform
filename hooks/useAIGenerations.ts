// hooks/useAIGenerations.ts
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface AIGeneration {
  id: string;
  taskId: string;
  status: 'pending' | 'completed' | 'failed';
  title: string;
  style: string;
  prompt: string;
  createdAt: string;
  tracks: AITrack[];
}

export interface AITrack {
  id: string;
  title: string;
  audioUrl: string;
  streamAudioUrl: string;
  imageUrl: string;
  duration: number;
  prompt: string;
  modelName: string;
  tags: string;
  createTime: number;
}

export function useAIGenerations() {
  const { data: session } = useSession();
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setGenerations([]);
      setLoading(false);
      return;
    }

    const fetchGenerations = async () => {
      try {
        setLoading(true);
        console.log('🔄 Récupération des générations pour userId:', session?.user?.id);
        
        const response = await fetch('/api/ai/generations', {
          credentials: 'include'
        });

        console.log('📡 Réponse API:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erreur API:', errorText);
          throw new Error(`Erreur ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('📊 Données reçues:', data);
        console.log('📊 Nombre de générations:', data.generations?.length || 0);
        
        setGenerations(data.generations || []);
      } catch (err: any) {
        console.error('❌ Erreur récupération générations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGenerations();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchGenerations, 30000);

    return () => clearInterval(interval);
  }, [session?.user?.id]);

  const refreshGenerations = async () => {
    try {
      setLoading(true);
      console.log('🔄 Rafraîchissement des générations...');
      
      const response = await fetch('/api/ai/generations', {
        credentials: 'include'
      });

      console.log('📡 Réponse refresh:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur refresh API:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Données refresh reçues:', data);
      console.log('📊 Nombre de générations refresh:', data.generations?.length || 0);
      
      setGenerations(data.generations || []);
    } catch (err: any) {
      console.error('❌ Erreur refresh générations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    generations,
    loading,
    error,
    refreshGenerations
  };
}
