import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserQuota } from '@/lib/aiGenerationService';

export function useAIQuota() {
  const { data: session } = useSession();
  const [quota, setQuota] = useState<UserQuota>({
    id: '',
    user_id: '',
    plan_type: 'free',
    monthly_limit: 5,
    used_this_month: 0,
    reset_date: new Date().toISOString(),
    remaining: 5
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ai/quota');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du quota');
      }

      const data = await response.json();
      setQuota(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Erreur quota:', err);
    } finally {
      setLoading(false);
    }
  };

  const incrementQuota = async () => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch('/api/ai/quota/increment', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'incrémentation du quota');
      }

      const success = await response.json();
      
      if (success) {
        // Recharger le quota
        await fetchQuota();
      }

      return success;
    } catch (err: any) {
      setError(err.message);
      console.error('Erreur incrément quota:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchQuota();
  }, [session?.user?.id]);

  return {
    quota,
    loading,
    error,
    refetch: fetchQuota,
    increment: incrementQuota,
    hasQuota: quota.remaining > 0,
    quotaPercentage: (quota.used_this_month / quota.monthly_limit) * 100
  };
}
