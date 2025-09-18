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
        const response = await fetch('/api/ai/generations', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des générations');
        }

        const data = await response.json();
        setGenerations(data.generations || []);
      } catch (err: any) {
        console.error('Erreur récupération générations:', err);
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
      const response = await fetch('/api/ai/generations', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des générations');
      }

      const data = await response.json();
      setGenerations(data.generations || []);
    } catch (err: any) {
      console.error('Erreur récupération générations:', err);
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
