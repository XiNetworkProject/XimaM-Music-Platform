import { useState, useEffect, useCallback } from 'react';

interface OnlineStatus {
  userId: string;
  name: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  minutesAgo: number;
}

interface UseOnlineStatusReturn {
  onlineStatuses: OnlineStatus[];
  isLoading: boolean;
  error: string | null;
  refreshStatuses: () => void;
  formatLastSeen: (date: Date) => string;
}

export const useOnlineStatus = (userIds: string[]): UseOnlineStatusReturn => {
  const [onlineStatuses, setOnlineStatuses] = useState<OnlineStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour formater le lastSeen de manière intelligente
  const formatLastSeen = useCallback((date: Date) => {
    const now = new Date();
    const timeDiff = now.getTime() - date.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    const hoursDiff = minutesDiff / 60;
    const daysDiff = hoursDiff / 24;

    if (minutesDiff < 1) return 'À l\'instant';
    if (minutesDiff < 60) return `Il y a ${Math.floor(minutesDiff)} min`;
    if (hoursDiff < 24) return `Il y a ${Math.floor(hoursDiff)}h`;
    if (daysDiff < 7) return `Il y a ${Math.floor(daysDiff)}j`;
    return `Il y a ${Math.floor(daysDiff)}j`;
  }, []);

  // Fonction pour récupérer les statuts en ligne
  const fetchOnlineStatuses = useCallback(async () => {
    if (userIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/online-status?userIds=${userIds.join(',')}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statuts en ligne');
      }

      const data = await response.json();
      
      if (data.success) {
        setOnlineStatuses(data.onlineStatuses);
      } else {
        throw new Error(data.error || 'Erreur serveur');
      }
    } catch (err) {
      console.error('Erreur récupération statuts en ligne:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [userIds]);

  // Fonction pour rafraîchir les statuts
  const refreshStatuses = useCallback(() => {
    fetchOnlineStatuses();
  }, [fetchOnlineStatuses]);

  // Charger les statuts au montage et quand les userIds changent
  useEffect(() => {
    fetchOnlineStatuses();
  }, [fetchOnlineStatuses]);

  // Mettre à jour les statuts toutes les 30 secondes
  useEffect(() => {
    if (userIds.length === 0) return;

    const interval = setInterval(() => {
      fetchOnlineStatuses();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOnlineStatuses, userIds]);

  return {
    onlineStatuses,
    isLoading,
    error,
    refreshStatuses,
    formatLastSeen
  };
}; 