import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface UserQuotaUI {
  id: string;
  user_id: string;
  plan_type: 'free' | 'starter' | 'pro' | 'enterprise';
  monthly_limit: number;
  used_this_month: number;
  reset_date: string;
  remaining: number;
}

export function useAIQuota() {
  const { data: session } = useSession();
  const [quota, setQuota] = useState<UserQuotaUI>({
    id: '',
    user_id: '',
    plan_type: 'free',
    monthly_limit: 1,
    used_this_month: 0,
    reset_date: new Date().toISOString(),
    remaining: 1,
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
      const response = await fetch('/api/ai/quota', { headers: { 'Cache-Control': 'no-store' } });
      if (!response.ok) throw new Error('Erreur lors de la récupération du quota');
      const data = await response.json();
      setQuota(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Erreur quota:', err);
    } finally {
      setLoading(false);
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
    hasQuota: quota.remaining > 0,
    quotaPercentage: quota.monthly_limit > 0 ? ((quota.monthly_limit - quota.remaining) / quota.monthly_limit) * 100 : 0,
  };
}
